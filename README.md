# WayPoint WRT 🧭

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: OpenWrt](https://img.shields.io/badge/Platform-OpenWrt%2021.02%20--%2025.x-teal.svg)](https://openwrt.org)
[![Architecture: MIPS / ARM / x86_64](https://img.shields.io/badge/Arch-mipsel%20%7C%20aarch64%20%7C%20x86__64-orange.svg)](#)
[![Runtime RAM: < 2MB](https://img.shields.io/badge/Memory-%3C%202%20MB%20RAM-success.svg)](#)
[![WireGuard: Native](https://img.shields.io/badge/WireGuard-Kernel%20Module-red.svg)](https://www.wireguard.com)

> **Native OpenWrt WAN Policy & WireGuard Egress Dispatcher**  
> An ultra-lightweight, single-binary Rust daemon with an embedded responsive Progressive Web App (PWA) for granular per-device and per-service routing on OpenWrt routers.

---

## ⚡ Highlights

* **Ultra-Lightweight Native Daemon**: Written in pure, safe Rust. Consumes **< 2 MB RAM** and **0% CPU** at idle. No Docker, no Node.js, and no external runtime required.
* **1-Tap Per-Device Routing**: Seamlessly dispatch individual LAN clients (phones, laptops, TVs, IoT devices) to direct WAN or encrypted multi-region WireGuard tunnels (`wgus`, `wges`, `wgjp`, etc.) without dropping other network connections.
* **Smart App & Domain Policies**: Direct streaming and domain traffic (e.g. Netflix, Crunchyroll, Disney+, Plex) through designated VPN tunnels automatically via OpenWrt Policy-Based Routing (`pbr`).
* **Instant WireGuard `.conf` Import**: Drag-and-drop or paste standard `.conf` files to provision UCI network interfaces, peers, and firewall zones in seconds.
* **Live Hardware Vendor Recognition**: Real-time IEEE OUI hardware MAC lookup and randomized MAC detection with 1-tap friendly rename suggestions.
* **Strict Killswitch**: Hardware-enforced traffic dropping if a tunnel drops, preventing unencrypted IP or DNS leakage.
* **SSL/TLS & Web Management**: Built-in EC P-256 CSR generator, certificate upload with `stunnel` TLS termination, and configurable web server port (default: `8443`).
* **Responsive PWA**: Full-featured mobile experience with offline caching, haptics, and instant touch navigation.

---

## 🏗️ Architecture

> 🧭 **Interactive Diagram**: An interactive, zoomable runtime and network architecture diagram rendered with **Archify** is available at [`docs/architecture.html`](docs/architecture.html) (or online via [GitHub Pages](https://lucian-sins.github.io/waypoint/)).

```
                 ┌──────────────────────────────────────────────────┐
                 │                  WayPoint WRT PWA                │
                 │        (Mobile / Desktop Browser on LAN)         │
                 └────────────────────────┬─────────────────────────┘
                                          │ HTTP / HTTPS (Port 8443)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           OpenWrt Router Gateway                                │
│                                                                                 │
│   ┌──────────────────────────┐             ┌────────────────────────────────┐   │
│   │   stunnel (TLS Proxy)    │──(local)───▶│     waypoint (Rust Daemon)     │   │
│   │    [Optional HTTPS]      │             │  • Embedded Vite React Assets  │   │
│   └──────────────────────────┘             │  • Zero-alloc HTTP Dispatcher  │   │
│                                            │  • Microsecond IPC Engine      │   │
│                                            └───────────────┬────────────────┘   │
│                                                            │ Subprocess Exec    │
│                                                            ▼                    │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                      /usr/sbin/vpnctl (Companion CLI)                   │   │
│   │         Fast POSIX ash interface with direct kernel & UCI IPC           │   │
│   └────────────┬───────────────────────────┬──────────────────────┬─────────┘   │
│                │                           │                      │             │
│                ▼                           ▼                      ▼             │
│        ┌───────────────┐           ┌───────────────┐      ┌───────────────┐     │
│        │  UCI Network  │           │   pbr Engine  │      │ WireGuard Dev │     │
│        │  (/etc/config)│           │ (nft / ipset) │      │  (wg show)    │     │
│        └───────────────┘           └───────────────┘      └───────────────┘     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Install (On Router)

WayPoint WRT is distributed as a single self-contained archive containing the pre-compiled binary, companion CLI, init scripts, and universal installer.

### 1. Download & Extract
Download the appropriate architecture release tarball to your router (e.g., via SCP or `wget`):

```sh
# Example for MIPS (TP-Link ER605 v2, MediaTek MT7621, etc.)
cd /tmp
wget https://github.com/lucian-sins/waypoint/releases/latest/download/waypoint-openwrt-mipsel.tar.gz
tar -xzf waypoint-openwrt-mipsel.tar.gz
cd waypoint-openwrt-mipsel
```

### 2. Run Installer
```sh
sh install.sh
```

The universal installer automatically:
1. Detects your router's architecture and flash storage.
2. Checks and installs required dependencies (`wireguard-tools`, `pbr`, `openssl-util`, `stunnel`).
3. Installs `/usr/bin/waypoint` and `/usr/sbin/vpnctl`.
4. Enables and launches the procd init service (`/etc/init.d/waypoint`).

### 3. Open Web UI
Once installed, open your browser and navigate to:
👉 **`http://<your-router-ip>:8443`** (e.g., `http://192.168.10.1:8443`)

---

## 🛠️ Building From Source

### Prerequisites
* **Node.js** v20+ & **npm**
* **Rust** 1.80+ with `rustc-bootstrap` enabled
* **Zig** 0.13+ (for effortless C-cross-linking to musl targets)

### 1. Build Frontend UI
```sh
npm install
npm run build
```
This compiles the single-page application into `dist_static/`.

### 2. Cross-Compile Daemon for OpenWrt

WayPoint WRT embeds the entire frontend into the final executable at compile time using `crates/waypoint/build.rs`.

#### MIPS Little-Endian (`mipsel-unknown-linux-musl`):
```sh
cd crates/waypoint
RUSTC_BOOTSTRAP=1 cargo build -Z build-std=std,panic_abort --target mipsel-unknown-linux-musl --release
```

#### ARM64 (`aarch64-unknown-linux-musl`):
```sh
cd crates/waypoint
RUSTC_BOOTSTRAP=1 cargo build -Z build-std=std,panic_abort --target aarch64-unknown-linux-musl --release
```

#### x86_64 (`x86_64-unknown-linux-musl`):
```sh
cd crates/waypoint
RUSTC_BOOTSTRAP=1 cargo build -Z build-std=std,panic_abort --target x86_64-unknown-linux-musl --release
```

The compiled binary (`~1.4 MB`) is fully statically linked with musl libc and has zero runtime dependencies.

---

## 🔒 SSL / HTTPS & Port Configuration

WayPoint WRT includes a built-in cryptographic management engine located in **Settings → SSL & Web Server**:

* **Custom Port**: Bind the web server to any port (e.g. `8443`, `4433`, `8080`). WayPoint updates `/etc/waypoint/settings.json` and smoothly reloads without dropped sessions.
* **EC P-256 CSR Generation**: Generate Elliptic Curve private keys and Certificate Signing Requests with Subject Alternative Names (auto-formatting IP addresses and domain names) in under **0.15s** on embedded MIPS CPUs.
* **Certificate Upload & Stunnel Proxy**: Paste or upload your signed PEM certificate. WayPoint WRT validates the certificate using `openssl-util` and automatically configures `stunnel` to handle TLS termination.

---

## 📦 Repository Structure

```
waypoint/
├── crates/
│   └── waypoint/          # Rust native daemon
│       ├── build.rs       # Compiles and embeds dist_static/ into static binary
│       ├── Cargo.toml     # Rust package configuration
│       └── src/main.rs    # Core daemon (HTTP server, UCI IPC, logging)
├── deploy/                # OpenWrt companion package
│   ├── install.sh         # Universal router installer
│   ├── uninstall.sh       # Clean removal script
│   ├── vpnctl             # POSIX helper for WireGuard & PBR
│   └── waypoint.init      # OpenWrt procd service definition
├── dist_release/          # Distribution tarball & standalone release files
├── public/                # Static web assets & modern PWA manifest
├── src/                   # React frontend (Vite + Tailwind CSS v4)
│   ├── components/        # Modern UI components (Dashboard, DeviceList, etc.)
│   ├── lib/               # Utility libraries (types, formatters, presets)
│   └── main.tsx           # Application entry point
├── index.html             # HTML shell
├── package.json           # Frontend dependencies & scripts
└── vite.config.ts         # Vite build configuration
```

---

## 🛡️ Security & Privacy

* **Zero Cloud Dependence**: WayPoint WRT runs entirely on your local router. No analytics, tracking, or external telemetry are collected.
* **Secure Key Storage**: WireGuard private keys are never stored in the application directory or embedded in binaries; they reside strictly inside OpenWrt's encrypted/protected `/etc/config/network`.
* **Safe Subprocess Execution**: Daemon communicates with local subsystems using parameterized arguments without shell injection vectors.

---

## 📄 License

WayPoint WRT is licensed under the [MIT License](LICENSE).
