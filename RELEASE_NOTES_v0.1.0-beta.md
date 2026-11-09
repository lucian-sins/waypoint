# WayPoint WRT v0.1.0-beta 🧭

Welcome to the initial beta release of **WayPoint WRT** — an ultra-lightweight, single-binary daemon with an embedded responsive Progressive Web App (PWA) designed for granular, 1-tap policy-based routing directly on OpenWrt routers.

---

## ⚡ What's New

### 🚀 Native Rust Daemon (< 2 MB RAM)
- Fully standalone native binary written in safe Rust.
- Zero runtime dependencies: directly embeds the Vite + React frontend single-page application into the binary at compile time.
- Sub-millisecond IPC communicating directly with OpenWrt's native UCI configuration and Policy-Based Routing (`pbr`) engine via `/usr/sbin/vpnctl`.

### 🛡️ Granular Multi-WAN & WireGuard Dispatching
- **1-Tap Egress Routing**: Dispatch individual devices (phones, computers, smart TVs, game consoles) to direct WAN or specific WireGuard tunnel endpoints (`wgus`, `wges`, `wgjp`, etc.) without network restarts.
- **Smart App Policies**: Direct domain-level traffic (Crunchyroll, Netflix, Disney+, Plex/Emby) through designated VPN tunnels automatically.
- **Strict Killswitch**: Hardware-enforced traffic dropping if a tunnel drops, preventing unencrypted IP or DNS leakage.
- **Direct WireGuard `.conf` Import**: Drag-and-drop or paste `.conf` profiles to provision UCI network interfaces and firewall zones instantly.

### 🔒 SSL/TLS & Web Server Management
- **Custom Web Server Port**: Easily select and apply any web server port (default: `8443`).
- **Embedded CSR Generator**: Generate EC P-256 elliptic curve private keys and Certificate Signing Requests with Subject Alternative Names (auto-formatting IP addresses and domain names) in ~0.13 seconds on MIPS CPUs.
- **Certificate Upload & Stunnel Proxy**: Paste or upload signed PEM certificates. Automatically activates native `stunnel` TLS termination with graceful fallback to HTTP.

### 📱 Responsive PWA Interface
- Mobile-first, responsive dark/light mode interface.
- Real-time ARP & DHCP lease discovery with IEEE OUI hardware manufacturer detection and friendly rename suggestions.
- Live endpoint latency pinging and tunnel handshake monitoring.

---

## 📦 Installation on OpenWrt

### 1. Download & Extract
Download the attached `waypoint-openwrt-mipsel.tar.gz` to your router:

```sh
cd /tmp
wget https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-mipsel.tar.gz
tar -xzf waypoint-openwrt-mipsel.tar.gz
cd waypoint-openwrt-mipsel
```

### 2. Run the Universal Installer
```sh
sh install.sh
```

### 3. Access Web UI
Open your browser and navigate to:
👉 **`http://<router-ip>:8443`** (e.g. `http://192.168.10.1:8443`)

---

## 📋 Release Assets
- **`waypoint-openwrt-mipsel.tar.gz`**: Universal installation tarball for OpenWrt MIPS routers (TP-Link ER605 v2, MediaTek MT7621, etc.).
- Includes pre-compiled `waypoint` binary, `vpnctl` CLI, `waypoint.init` service, and universal `install.sh`.
