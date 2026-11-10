use std::collections::{HashMap, VecDeque};
use std::env;
use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::Path;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime};

// Include generated static assets map from build.rs
include!(concat!(env!("OUT_DIR"), "/static_assets.rs"));

#[derive(serde::Serialize, Clone)]
struct LogEntry {
    time: String,
    level: String,
    message: String,
}

struct TelemetryCache {
    data: Option<String>,
    timestamp: Instant,
}

struct AppState {
    cache: Mutex<TelemetryCache>,
    logs: Mutex<VecDeque<LogEntry>>,
    ttl: Duration,
    settings_file: String,
    log_file: String,
}

fn get_log_time() -> String {
    let dur = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let total_secs = dur.as_secs();
    let millis = dur.subsec_millis();
    let secs = total_secs % 60;
    let mins = (total_secs / 60) % 60;
    let hours = (total_secs / 3600) % 24;
    format!("{:02}:{:02}:{:02}.{:03}", hours, mins, secs, millis)
}

fn app_log(state: &AppState, level: &str, msg: &str) {
    let t = get_log_time();
    let formatted = format!("[{}] [{}] {}", t, level, msg);
    println!("{}", formatted);

    let entry = LogEntry {
        time: t,
        level: level.to_string(),
        message: msg.to_string(),
    };

    if let Ok(mut logs) = state.logs.lock() {
        if logs.len() >= 250 {
            logs.pop_front();
        }
        logs.push_back(entry);
    }

    if let Ok(mut f) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&state.log_file)
    {
        let _ = writeln!(f, "{}", formatted);
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Default)]
struct DeviceAlias {
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    category: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct ServerConfig {
    #[serde(default = "default_port")]
    port: u16,
    #[serde(default)]
    ssl_enabled: bool,
}

fn default_port() -> u16 {
    8443
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            port: 8443,
            ssl_enabled: false,
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct AppSettings {
    #[serde(default = "default_subnets")]
    subnets: Vec<String>,
    #[serde(default)]
    router: RouterConfig,
    #[serde(default)]
    server: ServerConfig,
    #[serde(default)]
    ui: UiConfig,
    #[serde(default)]
    favorites: Vec<String>,
    #[serde(default)]
    device_aliases: HashMap<String, DeviceAlias>,
}

fn detect_local_subnets() -> Vec<String> {
    let mut subnets = Vec::new();
    if let Ok(output) = Command::new("ip")
        .args(&["-o", "-4", "addr", "show", "dev", "br-lan"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(pos) = parts.iter().position(|&x| x == "inet") {
                if let Some(cidr) = parts.get(pos + 1) {
                    if let Some((ip, prefix)) = cidr.split_once('/') {
                        let octets: Vec<&str> = ip.split('.').collect();
                        if octets.len() == 4 {
                            subnets.push(format!("{}.{}.{}.0/{}", octets[0], octets[1], octets[2], prefix));
                        }
                    }
                }
            }
        }
    }
    if subnets.is_empty() {
        vec!["192.168.1.0/24".to_string()]
    } else {
        subnets
    }
}

fn default_subnets() -> Vec<String> {
    detect_local_subnets()
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct RouterConfig {
    mode: String,
    host: String,
    ssh_key_path: String,
    strict_killswitch: bool,
    polling_interval_seconds: u32,
}

impl Default for RouterConfig {
    fn default() -> Self {
        Self {
            mode: "live".to_string(),
            host: "localhost".to_string(),
            ssh_key_path: "".to_string(),
            strict_killswitch: true,
            polling_interval_seconds: 10,
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct UiConfig {
    haptics_enabled: bool,
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            haptics_enabled: true,
        }
    }
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            subnets: default_subnets(),
            router: RouterConfig::default(),
            server: ServerConfig::default(),
            ui: UiConfig::default(),
            favorites: Vec::new(),
            device_aliases: HashMap::new(),
        }
    }
}

fn load_settings(path: &str) -> AppSettings {
    if Path::new(path).exists() {
        fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str::<AppSettings>(&s).ok())
            .unwrap_or_default()
    } else {
        AppSettings::default()
    }
}

fn save_settings(path: &str, settings: &AppSettings) -> Result<(), String> {
    if let Some(parent) = Path::new(path).parent() {
        let _ = fs::create_dir_all(parent);
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn get_vpnctl_path() -> String {
    env::var("WAYPOINT_VPNCTL").unwrap_or_else(|_| "/usr/sbin/vpnctl".to_string())
}

fn exec_vpnctl_internal(state: &AppState, args: &[&str], input: Option<&str>) -> Result<String, String> {
    let bin = get_vpnctl_path();
    let cmd_str = format!("{} {}", bin, args.join(" "));
    let start = Instant::now();

    let output = if let Some(stdin_data) = input {
        let mut child = Command::new(&bin)
            .args(args)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| {
                let err_msg = format!("Failed to spawn {}: {}", bin, e);
                app_log(state, "ERROR", &err_msg);
                err_msg
            })?;

        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(stdin_data.as_bytes());
        }

        child.wait_with_output().map_err(|e| {
            let err_msg = format!("Failed to wait for {}: {}", bin, e);
            app_log(state, "ERROR", &err_msg);
            err_msg
        })?
    } else {
        Command::new(&bin)
            .args(args)
            .output()
            .map_err(|e| {
                let err_msg = format!("Failed to execute {}: {}", bin, e);
                app_log(state, "ERROR", &err_msg);
                err_msg
            })?
    };

    let elapsed = start.elapsed().as_millis();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if !output.status.success() {
        let err = if stderr.is_empty() {
            stdout
        } else {
            stderr
        };
        app_log(
            state,
            "ERROR",
            &format!("{} failed ({}ms): {}", cmd_str, elapsed, err),
        );
        return Err(err);
    }

    app_log(
        state,
        "INFO",
        &format!("{} completed in {}ms", cmd_str, elapsed),
    );
    Ok(stdout)
}

fn exec_vpnctl(state: &AppState, args: &[&str]) -> Result<String, String> {
    exec_vpnctl_internal(state, args, None)
}

fn exec_vpnctl_with_stdin(state: &AppState, args: &[&str], input: &str) -> Result<String, String> {
    exec_vpnctl_internal(state, args, Some(input))
}

#[derive(serde::Deserialize)]
struct AddTunnelPayload {
    id: String,
    label: String,
    endpoint: String,
    provider: Option<String>,
    #[serde(rename = "confContent")]
    conf_content: Option<String>,
    #[serde(rename = "privateKey")]
    private_key: Option<String>,
    address: Option<String>,
    #[serde(rename = "publicKey")]
    public_key: Option<String>,
    dns: Option<String>,
}

fn format_conf(p: &AddTunnelPayload) -> String {
    let mut conf = String::from("[Interface]\n");
    if let Some(priv_key) = &p.private_key {
        conf.push_str(&format!("PrivateKey = {}\n", priv_key.trim()));
    }
    if let Some(addr) = &p.address {
        conf.push_str(&format!("Address = {}\n", addr.trim()));
    }
    if let Some(dns) = &p.dns {
        conf.push_str(&format!("DNS = {}\n", dns.trim()));
    }
    conf.push_str("\n[Peer]\n");
    if let Some(pub_key) = &p.public_key {
        conf.push_str(&format!("PublicKey = {}\n", pub_key.trim()));
    }
    conf.push_str(&format!("Endpoint = {}\n", p.endpoint.trim()));
    conf.push_str("AllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25\n");
    conf
}

fn ping_host(host: &str) -> Option<u32> {
    if host.is_empty()
        || host.starts_with('-')
        || !host.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
    {
        return None;
    }
    let output = Command::new("ping")
        .args(&["-c", "1", "-W", "1", host])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&output.stdout);
    for line in s.lines() {
        if let Some(pos) = line.find("time=") {
            let rest = &line[pos + 5..];
            let num_str: String = rest
                .chars()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect();
            if let Ok(val) = num_str.parse::<f64>() {
                return Some(val.round() as u32);
            }
        }
    }
    None
}

fn merge_device_aliases(raw_json: &str, settings: &AppSettings) -> String {
    let mut val: serde_json::Value = match serde_json::from_str(raw_json) {
        Ok(v) => v,
        Err(_) => return raw_json.to_string(),
    };

    if let Some(devices) = val.get_mut("devices").and_then(|d| d.as_array_mut()) {
        for dev in devices.iter_mut() {
            let mac = dev
                .get("mac")
                .and_then(|m| m.as_str())
                .map(|s| s.to_lowercase());
            let ip = dev
                .get("ip")
                .and_then(|i| i.as_str())
                .map(|s| s.to_string());

            let alias = mac
                .as_ref()
                .and_then(|m| settings.device_aliases.get(m))
                .or_else(|| ip.as_ref().and_then(|i| settings.device_aliases.get(i)));

            if let Some(a) = alias {
                if !a.name.is_empty() {
                    dev["name"] = serde_json::Value::String(a.name.clone());
                }
                if let Some(icon) = &a.icon {
                    dev["icon"] = serde_json::Value::String(icon.clone());
                }
                if let Some(cat) = &a.category {
                    dev["category"] = serde_json::Value::String(cat.clone());
                }
            }
        }
    }

    serde_json::to_string(&val).unwrap_or_else(|_| raw_json.to_string())
}

fn respond_bytes(
    mut stream: TcpStream,
    status: u16,
    status_text: &str,
    content_type: &str,
    cache_control: &str,
    body: &[u8],
) {
    let headers = format!(
        "HTTP/1.1 {} {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: {}\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization\r\nConnection: close\r\n\r\n",
        status, status_text, content_type, body.len(), cache_control
    );
    let _ = stream.write_all(headers.as_bytes());
    let _ = stream.write_all(body);
    let _ = stream.flush();
}

fn respond_json(stream: TcpStream, status: u16, json: &str) {
    let status_text = match status {
        200 => "OK",
        201 => "Created",
        400 => "Bad Request",
        404 => "Not Found",
        500 => "Internal Server Error",
        502 => "Bad Gateway",
        _ => "Status",
    };
    respond_bytes(
        stream,
        status,
        status_text,
        "application/json",
        "no-store, max-age=0",
        json.as_bytes(),
    );
}

fn handle_connection(mut stream: TcpStream, state: Arc<AppState>) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(10)));

    let mut reader = BufReader::new(&stream);
    let mut request_line = String::new();
    if reader.read_line(&mut request_line).is_err() || request_line.is_empty() {
        return;
    }

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return;
    }

    let method = parts[0];
    let uri = parts[1];
    let path = uri.split('?').next().unwrap_or("/");
    let query = uri.split('?').nth(1).unwrap_or("");
    let is_clean_sim = query.contains("clean=1") || query.contains("clean=true");

    // Handle CORS preflight
    if method == "OPTIONS" {
        let headers = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
        let _ = stream.write_all(headers.as_bytes());
        return;
    }

    // Read headers to determine Content-Length if POST/PUT/PATCH
    let mut content_length = 0;
    let mut header_count = 0;
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).is_err() || line.trim().is_empty() {
            break;
        }
        header_count += 1;
        if header_count > 100 {
            respond_json(stream, 400, r#"{"error":"Too many request headers"}"#);
            return;
        }
        let lower = line.to_lowercase();
        if lower.starts_with("content-length:") {
            if let Some(val) = line.split(':').nth(1) {
                content_length = val.trim().parse::<usize>().unwrap_or(0);
            }
        }
    }

    // Guard against excessive payload size to prevent OOM on low-memory router
    const MAX_BODY_SIZE: usize = 2 * 1024 * 1024; // 2 MB
    if content_length > MAX_BODY_SIZE {
        respond_json(stream, 413, r#"{"error":"Payload too large (max 2MB)"}"#);
        return;
    }

    // Read body
    let mut body = vec![0u8; content_length];
    if content_length > 0 {
        if reader.read_exact(&mut body).is_err() {
            respond_json(stream, 400, r#"{"error":"Incomplete request body"}"#);
            return;
        }
    }
    let body_str = String::from_utf8_lossy(&body);

    // API Route Dispatching
    if path.starts_with("/api") {
        let path_segments: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();

        // GET /api/logs
        if method == "GET" && path == "/api/logs" {
            let logs_guard = state.logs.lock().unwrap();
            let entries: Vec<LogEntry> = logs_guard.iter().cloned().collect();
            let resp = serde_json::json!({
                "success": true,
                "count": entries.len(),
                "logs": entries,
            });
            respond_json(stream, 200, &resp.to_string());
            return;
        }

        // DELETE /api/logs
        if method == "DELETE" && path == "/api/logs" {
            {
                let mut logs_guard = state.logs.lock().unwrap();
                logs_guard.clear();
            }
            let _ = fs::write(&state.log_file, "");
            app_log(&state, "INFO", "System logs cleared by user");
            respond_json(stream, 200, r#"{"success":true,"message":"Logs cleared"}"#);
            return;
        }

        // GET /api/system/info
        if method == "GET" && path == "/api/system/info" {
            let uptime = fs::read_to_string("/proc/uptime").unwrap_or_default();
            let model = fs::read_to_string("/tmp/sysinfo/model")
                .or_else(|_| fs::read_to_string("/proc/device-tree/model"))
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|_| "Generic OpenWrt Router".to_string());
            let resp = serde_json::json!({
                "mode": "native",
                "daemon": "waypoint",
                "version": "0.1.0",
                "arch": std::env::consts::ARCH,
                "target": model,
                "ipc": format!("localhost ({})", get_vpnctl_path()),
                "port": 8443,
                "uptime_raw": uptime.trim(),
                "status": "active"
            });
            respond_json(stream, 200, &resp.to_string());
            return;
        }

        // GET /api/telemetry
        if method == "GET" && path == "/api/telemetry" {
            // Clean install simulation mode
            if is_clean_sim {
                app_log(&state, "INFO", "Simulating clean first-time install (0 tunnels, direct WAN)");
                let devices_raw = exec_vpnctl(&state, &["devices"]).unwrap_or_else(|_| "[]".to_string());
                let mut val = serde_json::json!({
                    "status": {
                        "router": {
                            "release": "OpenWrt 25.12 (Clean Install)",
                            "uptime_s": 0,
                            "wan_up": true,
                            "wan_ip": "100.113.122.53"
                        },
                        "pbr": {
                            "enabled": true,
                            "strict": true,
                            "policies": 0
                        }
                    },
                    "devices": serde_json::from_str::<serde_json::Value>(&devices_raw).unwrap_or_default(),
                    "tunnels": [],
                    "apps": []
                });
                if let Some(devs) = val.get_mut("devices").and_then(|d| d.as_array_mut()) {
                    for d in devs.iter_mut() {
                        d["tunnel"] = serde_json::Value::String("direct".to_string());
                        d["policy"] = serde_json::Value::String("none".to_string());
                    }
                }
                respond_json(stream, 200, &val.to_string());
                return;
            }

            let settings = load_settings(&state.settings_file);
            let mut cache = state.cache.lock().unwrap();
            let now = Instant::now();

            if let Some(ref data) = cache.data {
                if now.duration_since(cache.timestamp) < state.ttl {
                    respond_json(stream, 200, data);
                    return;
                }
            }

            match exec_vpnctl(&state, &["telemetry"]) {
                Ok(raw) => {
                    let enriched = merge_device_aliases(&raw, &settings);
                    cache.data = Some(enriched.clone());
                    cache.timestamp = now;
                    respond_json(stream, 200, &enriched);
                }
                Err(err) => {
                    let err_json = serde_json::json!({
                        "error": "Failed to fetch telemetry",
                        "verbatim": err
                    });
                    respond_json(stream, 502, &err_json.to_string());
                }
            }
            return;
        }

        // POST /api/pbr/strict
        if method == "POST" && path == "/api/pbr/strict" {
            #[derive(serde::Deserialize)]
            struct StrictPayload {
                strict: Option<bool>,
            }
            let payload: StrictPayload =
                serde_json::from_str(&body_str).unwrap_or(StrictPayload { strict: None });
            let strict_val = payload.strict.unwrap_or(true);
            let arg = if strict_val { "1" } else { "0" };

            {
                let mut cache = state.cache.lock().unwrap();
                cache.data = None;
            }

            match exec_vpnctl(&state, &["strict", arg]) {
                Ok(_) => {
                    let status =
                        exec_vpnctl(&state, &["status"]).unwrap_or_else(|_| "{}".to_string());
                    let status_json: serde_json::Value =
                        serde_json::from_str(&status).unwrap_or_default();
                    let resp = serde_json::json!({
                        "success": true,
                        "strict": strict_val,
                        "status": status_json
                    });
                    respond_json(stream, 200, &resp.to_string());
                }
                Err(err) => {
                    let err_json = serde_json::json!({ "error": err });
                    respond_json(stream, 500, &err_json.to_string());
                }
            }
            return;
        }

        // GET & POST /api/settings
        if path == "/api/settings" {
            if method == "GET" {
                let settings = load_settings(&state.settings_file);
                let json_str = serde_json::to_string(&settings).unwrap_or_default();
                respond_json(stream, 200, &json_str);
            } else if method == "POST" {
                if let Ok(settings) = serde_json::from_str::<AppSettings>(&body_str) {
                    let _ = save_settings(&state.settings_file, &settings);
                    {
                        let mut cache = state.cache.lock().unwrap();
                        cache.data = None;
                    }
                    app_log(&state, "INFO", "Settings successfully saved");
                    let json_str = serde_json::to_string(&settings).unwrap_or_default();
                    respond_json(stream, 200, &json_str);
                } else {
                    respond_json(stream, 400, r#"{"error":"Invalid settings JSON"}"#);
                }
            }
            return;
        }

        // GET /api/ssl - SSL status and certificate info
        if path == "/api/ssl" && method == "GET" {
            let settings = load_settings(&state.settings_file);
            match exec_vpnctl(&state, &["ssl", "status"]) {
                Ok(raw) => {
                    let mut val: serde_json::Value = serde_json::from_str(&raw).unwrap_or_default();
                    if let Some(obj) = val.as_object_mut() {
                        obj.insert("web_port".to_string(), serde_json::json!(settings.server.port));
                        obj.insert("ssl_enabled".to_string(), serde_json::json!(settings.server.ssl_enabled));
                    }
                    respond_json(stream, 200, &val.to_string());
                }
                Err(err) => {
                    let err_json = serde_json::json!({
                        "error": err,
                        "has_openssl": false,
                        "has_stunnel": false,
                        "web_port": settings.server.port,
                        "ssl_enabled": settings.server.ssl_enabled
                    });
                    respond_json(stream, 200, &err_json.to_string());
                }
            }
            return;
        }

        // POST /api/ssl/csr - Generate new private key and CSR
        if path == "/api/ssl/csr" && method == "POST" {
            #[derive(serde::Deserialize)]
            struct CsrRequest {
                common_name: String,
                sans: Option<String>,
                organization: Option<String>,
                country: Option<String>,
            }

            if let Ok(req) = serde_json::from_str::<CsrRequest>(&body_str) {
                let cn = req.common_name.trim();
                let sans = req.sans.unwrap_or_else(|| cn.to_string());
                let org = req.organization.unwrap_or_else(|| "WayPoint WRT".to_string());
                let country = req.country.unwrap_or_else(|| "US".to_string());

                app_log(&state, "INFO", &format!("Generating SSL CSR for CN={}", cn));
                match exec_vpnctl(&state, &["ssl", "csr", cn, &sans, &org, &country]) {
                    Ok(resp) => respond_json(stream, 200, &resp),
                    Err(err) => {
                        let err_json = serde_json::json!({ "error": err });
                        respond_json(stream, 500, &err_json.to_string());
                    }
                }
            } else {
                respond_json(stream, 400, r#"{"error":"Invalid CSR payload. common_name is required."}"#);
            }
            return;
        }

        // POST /api/ssl/cert - Upload signed certificate & activate HTTPS
        if path == "/api/ssl/cert" && method == "POST" {
            #[derive(serde::Deserialize)]
            struct CertUploadRequest {
                cert_pem: String,
                port: Option<u16>,
            }

            if let Ok(req) = serde_json::from_str::<CertUploadRequest>(&body_str) {
                let settings = load_settings(&state.settings_file);
                let port = req.port.unwrap_or(settings.server.port);

                app_log(&state, "INFO", &format!("Installing SSL certificate for port {}", port));
                match exec_vpnctl_with_stdin(&state, &["ssl", "cert", &port.to_string()], &req.cert_pem) {
                    Ok(resp) => {
                        let mut updated_settings = settings;
                        updated_settings.server.ssl_enabled = true;
                        updated_settings.server.port = port;
                        let _ = save_settings(&state.settings_file, &updated_settings);
                        respond_json(stream, 200, &resp);
                    }
                    Err(err) => {
                        let err_json = serde_json::json!({ "error": err });
                        respond_json(stream, 400, &err_json.to_string());
                    }
                }
            } else {
                respond_json(stream, 400, r#"{"error":"Invalid certificate payload. cert_pem is required."}"#);
            }
            return;
        }

        // POST /api/ssl/toggle - Enable or disable HTTPS
        if path == "/api/ssl/toggle" && method == "POST" {
            #[derive(serde::Deserialize)]
            struct SslToggleRequest {
                enabled: bool,
                port: Option<u16>,
            }

            if let Ok(req) = serde_json::from_str::<SslToggleRequest>(&body_str) {
                let mut settings = load_settings(&state.settings_file);
                let port = req.port.unwrap_or(settings.server.port);

                let res = if req.enabled {
                    exec_vpnctl(&state, &["ssl", "enable", &port.to_string()])
                } else {
                    exec_vpnctl(&state, &["ssl", "disable"])
                };

                match res {
                    Ok(resp) => {
                        settings.server.ssl_enabled = req.enabled;
                        settings.server.port = port;
                        let _ = save_settings(&state.settings_file, &settings);
                        app_log(&state, "INFO", &format!("SSL mode changed to enabled={}", req.enabled));
                        respond_json(stream, 200, &resp);
                    }
                    Err(err) => {
                        let err_json = serde_json::json!({ "error": err });
                        respond_json(stream, 500, &err_json.to_string());
                    }
                }
            } else {
                respond_json(stream, 400, r#"{"error":"Invalid toggle payload"}"#);
            }
            return;
        }

        // POST /api/system/port - Change Web Server Port
        if path == "/api/system/port" && method == "POST" {
            #[derive(serde::Deserialize)]
            struct PortChangeRequest {
                port: u16,
            }

            if let Ok(req) = serde_json::from_str::<PortChangeRequest>(&body_str) {
                if req.port == 0 {
                    respond_json(stream, 400, r#"{"error":"Port must be between 1 and 65535"}"#);
                    return;
                }

                let mut settings = load_settings(&state.settings_file);
                settings.server.port = req.port;
                let _ = save_settings(&state.settings_file, &settings);

                app_log(&state, "INFO", &format!("Web server port changed to {}", req.port));
                match exec_vpnctl(&state, &["ssl", "port", &req.port.to_string()]) {
                    Ok(resp) => respond_json(stream, 200, &resp),
                    Err(err) => {
                        let err_json = serde_json::json!({ "error": err });
                        respond_json(stream, 500, &err_json.to_string());
                    }
                }
            } else {
                respond_json(stream, 400, r#"{"error":"Invalid port payload"}"#);
            }
            return;
        }

        // POST /api/settings/test-connection
        if path == "/api/settings/test-connection" {
            let resp = serde_json::json!({
                "success": true,
                "reachable": true,
                "vpnctlInstalled": true,
                "latency_ms": 1,
                "release": "OpenWrt 25.12 (Native daemon)",
                "note": "Native daemon on localhost"
            });
            respond_json(stream, 200, &resp.to_string());
            return;
        }

        // GET /api/settings/ssh-key
        if path == "/api/settings/ssh-key" {
            let resp = serde_json::json!({
                "key": "Native localhost daemon — no SSH required"
            });
            respond_json(stream, 200, &resp.to_string());
            return;
        }

        // GET & POST /api/favorites
        if path == "/api/favorites" {
            let mut settings = load_settings(&state.settings_file);
            if method == "GET" {
                let json_str = serde_json::to_string(&settings.favorites).unwrap_or_default();
                respond_json(stream, 200, &json_str);
            } else if method == "POST" {
                #[derive(serde::Deserialize)]
                struct FavPayload {
                    favorites: Option<Vec<String>>,
                }
                let favs = if let Ok(p) = serde_json::from_str::<FavPayload>(&body_str) {
                    p.favorites.unwrap_or_default()
                } else if let Ok(arr) = serde_json::from_str::<Vec<String>>(&body_str) {
                    arr
                } else {
                    Vec::new()
                };
                settings.favorites = favs;
                let _ = save_settings(&state.settings_file, &settings);
                let json_str = serde_json::to_string(&settings.favorites).unwrap_or_default();
                respond_json(stream, 200, &json_str);
            }
            return;
        }

        // POST /api/devices/discover
        if method == "POST" && path == "/api/devices/discover" {
            {
                let mut cache = state.cache.lock().unwrap();
                cache.data = None;
            }
            match exec_vpnctl(&state, &["discover"]) {
                Ok(raw) => {
                    let settings = load_settings(&state.settings_file);
                    let enriched =
                        merge_device_aliases(&format!(r#"{{"devices":{}}}"#, raw), &settings);
                    let val: serde_json::Value =
                        serde_json::from_str(&enriched).unwrap_or_default();
                    let devices = val
                        .get("devices")
                        .cloned()
                        .unwrap_or(serde_json::Value::Array(Vec::new()));
                    let resp = serde_json::json!({
                        "devices": devices,
                        "newCount": 0
                    });
                    respond_json(stream, 200, &resp.to_string());
                }
                Err(e) => {
                    let err_json = serde_json::json!({ "error": e });
                    respond_json(stream, 500, &err_json.to_string());
                }
            }
            return;
        }

        // Device subroutes: /api/devices/:ip/...
        if path_segments.len() >= 3 && path_segments[0] == "api" && path_segments[1] == "devices" {
            let ip = path_segments[2];

            // POST /api/devices/:ip/tunnel
            if path_segments.len() == 4 && path_segments[3] == "tunnel" && method == "POST" {
                #[derive(serde::Deserialize)]
                struct AssignPayload {
                    tunnel: String,
                }
                if let Ok(payload) = serde_json::from_str::<AssignPayload>(&body_str) {
                    app_log(
                        &state,
                        "INFO",
                        &format!("Assign device {} -> tunnel {}", ip, payload.tunnel),
                    );
                    {
                        let mut cache = state.cache.lock().unwrap();
                        cache.data = None;
                    }
                    match exec_vpnctl(&state, &["assign", ip, &payload.tunnel]) {
                        Ok(_) => {
                            let settings = load_settings(&state.settings_file);
                            // Retrieve updated fresh device record
                            let fresh_dev = if let Ok(raw) = exec_vpnctl(&state, &["devices"]) {
                                let enriched = merge_device_aliases(
                                    &format!(r#"{{"devices":{}}}"#, raw),
                                    &settings,
                                );
                                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&enriched)
                                {
                                    val.get("devices")
                                        .and_then(|d| d.as_array())
                                        .and_then(|arr| {
                                            arr.iter()
                                                .find(|d| {
                                                    d.get("ip").and_then(|i| i.as_str()) == Some(ip)
                                                })
                                                .cloned()
                                        })
                                } else {
                                    None
                                }
                            } else {
                                None
                            };

                            let resp = fresh_dev.unwrap_or_else(|| {
                                serde_json::json!({
                                    "ip": ip,
                                    "name": format!("Device-{}", ip),
                                    "mac": "",
                                    "tunnel": payload.tunnel,
                                    "policy": "none",
                                    "online": true,
                                    "icon": "laptop",
                                    "rx_bytes": 0,
                                    "tx_bytes": 0
                                })
                            });
                            respond_json(stream, 200, &resp.to_string());
                        }
                        Err(e) => {
                            let err_json = serde_json::json!({ "error": e });
                            respond_json(stream, 500, &err_json.to_string());
                        }
                    }
                } else {
                    respond_json(stream, 400, r#"{"error":"Invalid payload"}"#);
                }
                return;
            }

            // POST /api/devices/:ip/rename
            if path_segments.len() == 4 && path_segments[3] == "rename" && method == "POST" {
                #[derive(serde::Deserialize)]
                struct RenamePayload {
                    name: String,
                    icon: Option<String>,
                    category: Option<String>,
                }
                if let Ok(payload) = serde_json::from_str::<RenamePayload>(&body_str) {
                    let mut settings = load_settings(&state.settings_file);

                    // Try to find device MAC from current devices to index alias by MAC
                    let mut alias_key = ip.to_string();
                    if let Ok(dev_raw) = exec_vpnctl(&state, &["devices"]) {
                        if let Ok(dev_arr) =
                            serde_json::from_str::<Vec<serde_json::Value>>(&dev_raw)
                        {
                            if let Some(dev) = dev_arr
                                .iter()
                                .find(|d| d.get("ip").and_then(|i| i.as_str()) == Some(ip))
                            {
                                if let Some(mac) = dev.get("mac").and_then(|m| m.as_str()) {
                                    if !mac.is_empty() {
                                        alias_key = mac.to_lowercase();
                                    }
                                }
                            }
                        }
                    }

                    settings.device_aliases.insert(
                        alias_key,
                        DeviceAlias {
                            name: payload.name.trim().to_string(),
                            icon: payload.icon.clone(),
                            category: payload.category.clone(),
                        },
                    );
                    let _ = save_settings(&state.settings_file, &settings);
                    {
                        let mut cache = state.cache.lock().unwrap();
                        cache.data = None;
                    }

                    app_log(
                        &state,
                        "INFO",
                        &format!("Renamed device {} -> {}", ip, payload.name.trim()),
                    );
                    let resp = serde_json::json!({
                        "ip": ip,
                        "name": payload.name.trim(),
                        "icon": payload.icon,
                        "category": payload.category
                    });
                    respond_json(stream, 200, &resp.to_string());
                } else {
                    respond_json(stream, 400, r#"{"error":"Invalid rename payload"}"#);
                }
                return;
            }
        }

        // POST /api/tunnels (Create / Import WireGuard Location)
        if method == "POST" && path == "/api/tunnels" {
            if let Ok(payload) = serde_json::from_str::<AddTunnelPayload>(&body_str) {
                let id_clean: String = payload.id.chars().filter(|c| c.is_ascii_alphanumeric()).collect();
                let final_id = if id_clean.starts_with("wg") { id_clean } else { format!("wg{}", id_clean) };
                let label = if payload.label.trim().is_empty() { final_id.clone() } else { payload.label.trim().to_string() };

                let conf_text = if let Some(ref content) = payload.conf_content {
                    if !content.trim().is_empty() {
                        content.clone()
                    } else {
                        format_conf(&payload)
                    }
                } else {
                    format_conf(&payload)
                };

                {
                    let mut cache = state.cache.lock().unwrap();
                    cache.data = None;
                }

                app_log(&state, "INFO", &format!("Creating WireGuard tunnel {} ({})", final_id, label));

                match exec_vpnctl_with_stdin(&state, &["tunnel", "apply", &final_id, &label], &conf_text) {
                    Ok(_) => {
                        let tunnels_raw = exec_vpnctl(&state, &["tunnels"]).unwrap_or_else(|_| "[]".to_string());
                        let tunnels_val: serde_json::Value = serde_json::from_str(&tunnels_raw).unwrap_or(serde_json::Value::Array(Vec::new()));
                        let found = tunnels_val.as_array().and_then(|arr| {
                            arr.iter().find(|t| t.get("id").and_then(|i| i.as_str()) == Some(&final_id)).cloned()
                        });

                        let resp = found.unwrap_or_else(|| {
                            serde_json::json!({
                                "id": final_id,
                                "label": label,
                                "provider": payload.provider.unwrap_or_else(|| "custom".to_string()),
                                "state": "up",
                                "handshake_age_s": 0,
                                "rx_bytes": 0,
                                "tx_bytes": 0,
                                "endpoint": payload.endpoint,
                                "devices": [],
                                "latency_ms": null
                            })
                        });
                        respond_json(stream, 201, &resp.to_string());
                    }
                    Err(e) => {
                        let err_json = serde_json::json!({ "error": e });
                        respond_json(stream, 500, &err_json.to_string());
                    }
                }
            } else {
                respond_json(stream, 400, r#"{"error":"Invalid tunnel payload"}"#);
            }
            return;
        }

        // POST /api/tunnels/ping
        if method == "POST" && path == "/api/tunnels/ping" {
            if is_clean_sim {
                respond_json(stream, 200, "[]");
                return;
            }
            if let Ok(raw) = exec_vpnctl(&state, &["tunnels"]) {
                if let Ok(mut tunnels) = serde_json::from_str::<Vec<serde_json::Value>>(&raw) {
                    let mut hosts_to_ping: Vec<(usize, String)> = Vec::new();
                    for (idx, t) in tunnels.iter().enumerate() {
                        if t.get("state").and_then(|s| s.as_str()) == Some("up") {
                            if let Some(endpoint) = t.get("endpoint").and_then(|e| e.as_str()) {
                                let host = endpoint.split(':').next().unwrap_or(endpoint);
                                hosts_to_ping.push((idx, host.to_string()));
                            }
                        }
                    }

                    // Perform parallel ping probes via std::thread::scope to avoid sequential timeout blocking
                    let latencies: Vec<(usize, Option<u32>)> = thread::scope(|s| {
                        let handles: Vec<_> = hosts_to_ping
                            .into_iter()
                            .map(|(idx, host)| s.spawn(move || (idx, ping_host(&host))))
                            .collect();
                        handles
                            .into_iter()
                            .map(|h| h.join().unwrap_or((0, None)))
                            .collect()
                    });

                    for (idx, lat) in latencies {
                        if idx < tunnels.len() {
                            tunnels[idx]["latency_ms"] = lat
                                .map(serde_json::Value::from)
                                .unwrap_or(serde_json::Value::Null);
                        }
                    }

                    let resp = serde_json::to_string(&tunnels).unwrap_or_default();
                    respond_json(stream, 200, &resp);
                    return;
                }
            }
            respond_json(stream, 200, "[]");
            return;
        }

        // Tunnel subroutes: DELETE /api/tunnels/:id
        if path_segments.len() == 3
            && path_segments[0] == "api"
            && path_segments[1] == "tunnels"
            && method == "DELETE"
        {
            let id = path_segments[2];
            {
                let mut cache = state.cache.lock().unwrap();
                cache.data = None;
            }
            match exec_vpnctl(&state, &["tunnel", "delete", id]) {
                Ok(_) => {
                    let resp = serde_json::json!({ "success": true, "deletedId": id });
                    respond_json(stream, 200, &resp.to_string());
                }
                Err(e) => {
                    let err_json = serde_json::json!({ "error": e });
                    respond_json(stream, 500, &err_json.to_string());
                }
            }
            return;
        }

        // App routes: /api/apps and /api/apps/:id
        if path_segments.len() >= 2 && path_segments[0] == "api" && path_segments[1] == "apps" {
            // /api/apps/:id
            if path_segments.len() == 3 {
                let id = path_segments[2];
                if method == "POST" {
                    #[derive(serde::Deserialize)]
                    struct TogglePayload {
                        enabled: bool,
                    }
                    if let Ok(payload) = serde_json::from_str::<TogglePayload>(&body_str) {
                        {
                            let mut cache = state.cache.lock().unwrap();
                            cache.data = None;
                        }
                        let arg = if payload.enabled { "1" } else { "0" };
                        match exec_vpnctl(&state, &["app_toggle", id, arg]) {
                            Ok(_) => {
                                let resp = serde_json::json!({ "success": true, "id": id, "enabled": payload.enabled });
                                respond_json(stream, 200, &resp.to_string());
                            }
                            Err(e) => {
                                let err_json = serde_json::json!({ "error": e });
                                respond_json(stream, 500, &err_json.to_string());
                            }
                        }
                    } else {
                        respond_json(stream, 400, r#"{"error":"Invalid toggle payload"}"#);
                    }
                    return;
                } else if method == "DELETE" {
                    {
                        let mut cache = state.cache.lock().unwrap();
                        cache.data = None;
                    }
                    match exec_vpnctl(&state, &["app_delete", id]) {
                        Ok(_) => {
                            let resp = serde_json::json!({ "success": true, "deletedId": id });
                            respond_json(stream, 200, &resp.to_string());
                        }
                        Err(e) => {
                            let err_json = serde_json::json!({ "error": e });
                            respond_json(stream, 500, &err_json.to_string());
                        }
                    }
                    return;
                }
            }

            // POST /api/apps
            if path_segments.len() == 2 && method == "POST" {
                #[derive(serde::Deserialize)]
                struct AppRulePayload {
                    id: String,
                    name: Option<String>,
                    tunnel: String,
                    #[serde(rename = "targetDevice")]
                    target_device: Option<String>,
                    domains: Vec<String>,
                }
                if let Ok(rule) = serde_json::from_str::<AppRulePayload>(&body_str) {
                    {
                        let mut cache = state.cache.lock().unwrap();
                        cache.data = None;
                    }
                    let target = rule.target_device.as_deref().unwrap_or("all");
                    let name = rule.name.as_deref().unwrap_or(&rule.id);
                    let mut args = vec!["app_set", &rule.id, &rule.tunnel, target, name];
                    let domain_refs: Vec<&str> = rule.domains.iter().map(|s| s.as_str()).collect();
                    args.extend(domain_refs);

                    match exec_vpnctl(&state, &args) {
                        Ok(_) => respond_json(stream, 200, r#"{"success":true}"#),
                        Err(e) => {
                            let err_json = serde_json::json!({ "error": e });
                            respond_json(stream, 500, &err_json.to_string());
                        }
                    }
                } else {
                    respond_json(stream, 400, r#"{"error":"Invalid app rule payload"}"#);
                }
                return;
            }
        }

        // Basic read endpoints
        match (method, path) {
            ("GET", "/api/status") => {
                let res = exec_vpnctl(&state, &["status"])
                    .unwrap_or_else(|e| format!(r#"{{"error":"{}"}}"#, e));
                respond_json(stream, 200, &res);
            }
            ("GET", "/api/devices") => {
                let settings = load_settings(&state.settings_file);
                let res = exec_vpnctl(&state, &["devices"])
                    .unwrap_or_else(|e| format!(r#"{{"error":"{}"}}"#, e));
                let enriched =
                    merge_device_aliases(&format!(r#"{{"devices":{}}}"#, res), &settings);
                let val: serde_json::Value = serde_json::from_str(&enriched).unwrap_or_default();
                let devices = val.get("devices").unwrap_or(&serde_json::Value::Null);
                let out = serde_json::to_string(devices).unwrap_or_else(|_| res);
                respond_json(stream, 200, &out);
            }
            ("GET", "/api/tunnels") => {
                if is_clean_sim {
                    respond_json(stream, 200, "[]");
                    return;
                }
                let res = exec_vpnctl(&state, &["tunnels"])
                    .unwrap_or_else(|e| format!(r#"{{"error":"{}"}}"#, e));
                respond_json(stream, 200, &res);
            }
            ("GET", "/api/apps") => {
                if is_clean_sim {
                    respond_json(stream, 200, "[]");
                    return;
                }
                let res = exec_vpnctl(&state, &["apps"])
                    .unwrap_or_else(|e| format!(r#"{{"error":"{}"}}"#, e));
                respond_json(stream, 200, &res);
            }
            _ => {
                respond_json(stream, 404, r#"{"error":"Endpoint not found"}"#);
            }
        }
        return;
    }

    // Static Asset Serving (PWA files & SPA fallback)
    if let Some((bytes, mime)) = get_asset(path) {
        let cache_control = if path.starts_with("/assets/") {
            "public, max-age=31536000, immutable"
        } else {
            "no-cache"
        };
        respond_bytes(stream, 200, "OK", mime, cache_control, bytes);
    } else if let Some((bytes, mime)) = get_index() {
        // Fallback for React Router / SPA navigation (/devices, /apps)
        respond_bytes(stream, 200, "OK", mime, "no-cache", bytes);
    } else {
        respond_bytes(
            stream,
            404,
            "Not Found",
            "text/plain",
            "no-cache",
            b"Asset Not Found",
        );
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let settings_file = env::var("WAYPOINT_SETTINGS")
        .unwrap_or_else(|_| "/etc/waypoint/settings.json".to_string());
    let current_settings = load_settings(&settings_file);

    let port = args
        .iter()
        .position(|a| a == "--port" || a == "-p")
        .and_then(|idx| args.get(idx + 1))
        .and_then(|s| s.parse::<u16>().ok())
        .or_else(|| {
            env::var("WAYPOINT_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
        })
        .unwrap_or(current_settings.server.port);

    let bind_addr = format!("0.0.0.0:{}", port);
    let listener =
        TcpListener::bind(&bind_addr).expect(&format!("Failed to bind to {}", bind_addr));

    let state = Arc::new(AppState {
        cache: Mutex::new(TelemetryCache {
            data: None,
            timestamp: Instant::now() - Duration::from_secs(60),
        }),
        logs: Mutex::new(VecDeque::with_capacity(250)),
        ttl: Duration::from_millis(2500),
        settings_file,
        log_file: "/var/log/waypoint.log".to_string(),
    });

    app_log(
        &state,
        "INFO",
        &format!("⚡ WayPoint WRT Native OpenWrt Daemon started on http://{}", bind_addr),
    );

    for stream_res in listener.incoming() {
        match stream_res {
            Ok(stream) => {
                let state_clone = Arc::clone(&state);
                thread::spawn(move || {
                    handle_connection(stream, state_clone);
                });
            }
            Err(e) => {
                eprintln!("Connection failed: {}", e);
            }
        }
    }
}
