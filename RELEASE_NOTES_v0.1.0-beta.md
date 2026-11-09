# WayPoint WRT v0.1.0-beta 🧭

Welcome to the initial beta release of **WayPoint WRT** — an ultra-lightweight, single-binary daemon with an embedded responsive Progressive Web App (PWA) designed for granular, 1-tap policy-based routing directly on OpenWrt routers.

> 🌐 **Interactive Download Portal**: [https://lucian-sins.github.io/waypoint/downloads.html](https://lucian-sins.github.io/waypoint/downloads.html)  
> 🧭 **Interactive Architecture Diagram**: [https://lucian-sins.github.io/waypoint/](https://lucian-sins.github.io/waypoint/)

---

## ⚡ What's New

### 🚀 Multi-Architecture Support for OpenWrt
Full support for all major OpenWrt processor architectures with static musl libc linking:
- **MIPS 32-bit Little-Endian (`mipsel`)**: MediaTek MT7621, TP-Link ER605 v2, Xiaomi AX3000 / 4A, GL-MT300N-V2.
- **ARM64 (`aarch64`)**: Raspberry Pi 4 / 5, GL.iNet MT6000 (Flint 2), NanoPi R4S / R5S / R6S, Rockchip RK3568/RK3588.
- **x86_64 (`amd64`)**: Intel N100 / J4125 mini PCs, Proxmox VE OpenWrt VM, QEMU / KVM, Protectli Vault.
- **ARMv7 Hard-Float (`armv7`)**: Qualcomm IPQ4018 / IPQ4019, Netgear R7800, Linksys WRT3200ACM.
- **MIPS 32-bit Big-Endian (`mips`)**: Qualcomm Atheros AR71xx, AR9331, AR9344, TP-Link Archer C7 v2/v5.
- **ARMv6 Soft-Float (`armv6`)**: Raspberry Pi 1 Model B/B+, Raspberry Pi Zero / Zero W.

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

## 📦 Architecture Packages & Download Matrix

| Architecture | Target Triple | Archive Asset | Package Size | SHA-256 Checksum |
| :--- | :--- | :--- | :---: | :--- |
| **MIPS LE** | `mipsel-unknown-linux-musl` | [`waypoint-openwrt-mipsel.tar.gz`](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-mipsel.tar.gz) | 523 KB | `2b817497b0bed638def9c435e024c042c86f3e421140bf8b405a7c4fa93d324c` |
| **ARM64** | `aarch64-unknown-linux-musl` | [`waypoint-openwrt-aarch64.tar.gz`](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-aarch64.tar.gz) | 470 KB | `ce33fc15e18df335cc222228edbe790e202eb05a2e0521ddb9e78bf2bc118f85` |
| **x86_64** | `x86_64-unknown-linux-musl` | [`waypoint-openwrt-x86_64.tar.gz`](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-x86_64.tar.gz) | 478 KB | `edc9644cf68cce5ac17750beeb9ae5e3d08ff0ad8610956ec9cb93555d667f10` |
| **ARMv7** | `armv7-unknown-linux-musleabihf` | [`waypoint-openwrt-armv7.tar.gz`](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-armv7.tar.gz) | 476 KB | `a678d036de04a1127f3c62e78832ce48a0ea7635c8f6eca36fb42d3512c01c44` |
| **MIPS BE** | `mips-unknown-linux-musl` | [`waypoint-openwrt-mips.tar.gz`](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-mips.tar.gz) | 522 KB | `450ef1c20c0d9c8bb8f1cd6a7754f81ec2a680789782663138166c9d04a3f01b` |
| **ARMv6** | `arm-unknown-linux-musleabi` | [`waypoint-openwrt-armv6.tar.gz`](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-armv6.tar.gz) | 482 KB | `618832f07be8628b12d9aba000c977f79c49769b825059e43c91ebf26224dfdd` |
| **Checksums** | All Architectures | [`SHA256SUMS.txt`](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/SHA256SUMS.txt) | 1 KB | Plain text SHA-256 manifests |

---

## 🚀 Quick Router Installation

### 1. Download & Extract
Download the package corresponding to your router's CPU architecture (e.g. MIPS Little Endian):

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
👉 **`http://<router-ip>:8443`** (e.g. `http://192.168.10.1:8443` or `http://192.168.1.1:8443`)
