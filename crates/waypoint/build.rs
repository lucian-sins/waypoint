use std::env;
use std::fs;
use std::path::Path;

fn get_mime(path: &str) -> &'static str {
    if path.ends_with(".html") {
        "text/html; charset=utf-8"
    } else if path.ends_with(".js") {
        "application/javascript; charset=utf-8"
    } else if path.ends_with(".css") {
        "text/css; charset=utf-8"
    } else if path.ends_with(".svg") {
        "image/svg+xml"
    } else if path.ends_with(".webmanifest") || path.ends_with(".json") {
        "application/manifest+json"
    } else if path.ends_with(".png") {
        "image/png"
    } else if path.ends_with(".ico") {
        "image/x-icon"
    } else if path.ends_with(".woff2") {
        "font/woff2"
    } else if path.ends_with(".woff") {
        "font/woff"
    } else {
        "application/octet-stream"
    }
}

fn main() {
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("static_assets.rs");

    let dist_dir = Path::new("../../dist_static");
    println!("cargo:rerun-if-changed=../../dist_static");

    let mut match_arms = Vec::new();

    fn scan_dir(dir: &Path, base: &Path, match_arms: &mut Vec<String>) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    scan_dir(&path, base, match_arms);
                } else if path.is_file() {
                    let rel = path.strip_prefix(base).unwrap().to_str().unwrap().replace('\\', "/");
                    if rel == "index.html" {
                        continue;
                    }
                    let abs_path = fs::canonicalize(&path).unwrap().to_str().unwrap().replace('\\', "/");
                    let clean_abs = abs_path.trim_start_matches("//?/");
                    let mime = get_mime(&rel);
                    match_arms.push(format!(
                        "        \"{}\" => Some((include_bytes!(r\"{}\"), \"{}\")),",
                        rel, clean_abs, mime
                    ));
                }
            }
        }
    }

    scan_dir(dist_dir, dist_dir, &mut match_arms);

    let index_abs = fs::canonicalize(dist_dir.join("index.html")).unwrap().to_str().unwrap().replace('\\', "/");
    let clean_index = index_abs.trim_start_matches("//?/");

    let code = format!(
        r#"
pub fn get_asset(path: &str) -> Option<(&'static [u8], &'static str)> {{
    let clean = path.trim_start_matches('/');
    match clean {{
        "" | "index.html" => get_index(),
{}
        _ => None,
    }}
}}

pub fn get_index() -> Option<(&'static [u8], &'static str)> {{
    Some((include_bytes!(r"{}"), "text/html; charset=utf-8"))
}}
"#,
        match_arms.join("\n"),
        clean_index
    );

    fs::write(&dest_path, code).unwrap();
}
