# WayPoint WRT — Processor Architectures & Download Portal 🧭

Welcome to the **WayPoint WRT** download and hardware compatibility guide.

WayPoint WRT is distributed as **pre-compiled, statically linked binaries with zero runtime dependencies** and an embedded React Progressive Web App. Each package is tailored to a specific CPU architecture with optimal instruction sets and soft/hard-float ABIs.

> 🌐 **Interactive Download Portal**: Browse and download packages visually at [https://lucian-sins.github.io/waypoint/downloads.html](https://lucian-sins.github.io/waypoint/downloads.html).

---

## ⚡ Quick 1-Command Router Installation

Connect to your OpenWrt router via SSH and run the installer command corresponding to your router's architecture:

### 1. Identify Your Router's CPU
```sh
uname -m
```

### 2. Download & Run Installer

| Architecture | 1-Liner SSH Command |
| :--- | :--- |
| **MIPS Little Endian** (`mipsel`) | `wget https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-mipsel.tar.gz && tar -xzf waypoint-openwrt-mipsel.tar.gz && sh waypoint-openwrt-mipsel/install.sh` |
| **ARM64** (`aarch64`) | `wget https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-aarch64.tar.gz && tar -xzf waypoint-openwrt-aarch64.tar.gz && sh waypoint-openwrt-aarch64/install.sh` |
| **x86_64** (`amd64` / PC / VM) | `wget https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-x86_64.tar.gz && tar -xzf waypoint-openwrt-x86_64.tar.gz && sh waypoint-openwrt-x86_64/install.sh` |
| **ARMv7** (`armv7-musleabihf`) | `wget https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-armv7.tar.gz && tar -xzf waypoint-openwrt-armv7.tar.gz && sh waypoint-openwrt-armv7/install.sh` |
| **MIPS Big Endian** (`mips`) | `wget https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-mips.tar.gz && tar -xzf waypoint-openwrt-mips.tar.gz && sh waypoint-openwrt-mips/install.sh` |
| **ARMv6 Soft-Float** (`armv6`) | `wget https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-armv6.tar.gz && tar -xzf waypoint-openwrt-armv6.tar.gz && sh waypoint-openwrt-armv6/install.sh` |

---

## 📦 Release Packages & Hardware Matrix

| Package Archive | Target Triple | Size | OpenWrt Target | Common Router Hardware / Devices |
| :--- | :--- | :---: | :--- | :--- |
| [**waypoint-openwrt-mipsel.tar.gz**](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-mipsel.tar.gz) | `mipsel-unknown-linux-musl` | ~523 KB | `ramips/mt7621`, `ramips/mt76x8` | **TP-Link ER605 v2**, Xiaomi Router AX3000 / 4A Gigabit, GL.iNet MT300N-V2, MT7620/MT7628 devices |
| [**waypoint-openwrt-aarch64.tar.gz**](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-aarch64.tar.gz) | `aarch64-unknown-linux-musl` | ~470 KB | `bcm27xx/bcm2711`, `filogic`, `rockchip` | **Raspberry Pi 4 / 5**, GL.iNet MT6000 (Flint 2), FriendlyElec NanoPi R4S / R5S / R6S, Rockchip RK3568, Linksys E8450 |
| [**waypoint-openwrt-x86_64.tar.gz**](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-x86_64.tar.gz) | `x86_64-unknown-linux-musl` | ~478 KB | `x86/64` | **Intel N100 / J4125 / i226 mini PCs**, Proxmox VE OpenWrt VM, QEMU / KVM, VMware ESXi, Protectli Vault, PC Engines APU |
| [**waypoint-openwrt-armv7.tar.gz**](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-armv7.tar.gz) | `armv7-unknown-linux-musleabihf` | ~476 KB | `ipq40xx`, `mvebu/cortexa9` | **Qualcomm IPQ4018 / IPQ4019**, Netgear Nighthawk R7800, Linksys WRT3200ACM / WRT1900ACS, GL.iNet B1300 |
| [**waypoint-openwrt-mips.tar.gz**](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-mips.tar.gz) | `mips-unknown-linux-musl` | ~522 KB | `ath79/generic` | **Qualcomm Atheros AR71xx**, AR9331, AR9344, TP-Link Archer C7 v2/v5, GL.iNet AR150 / AR750 |
| [**waypoint-openwrt-armv6.tar.gz**](https://github.com/lucian-sins/waypoint/releases/download/v0.1.0-beta/waypoint-openwrt-armv6.tar.gz) | `arm-unknown-linux-musleabi` | ~482 KB | `bcm27xx/bcm2708` | **Raspberry Pi 1 Model B/B+**, Raspberry Pi Zero / Zero W |

---

## 🛡️ Integrity Checksums (SHA-256)

To verify the integrity of downloaded archives on your machine or router:

```sh
sha256sum -c SHA256SUMS.txt
```

### Official Checksums for `v0.1.0-beta`

```
75865f1f357d4f56ea78303ee6e8996011deacc4ae23ab52d5455db65dd925d7  waypoint-openwrt-mipsel.tar.gz
282f1d6aa9acf3f6e9941bb126bf3d599080a03835c386f27487e113ec030d92  waypoint-openwrt-mips.tar.gz
eac08979e95c6f35ed58002ab3a2a7016a79e4bdca9298ba5825bde998d636e8  waypoint-openwrt-aarch64.tar.gz
e10d15fde3a5fe9b1e9010136dbd1414fbee220855fe79951362200f44f7dfe2  waypoint-openwrt-armv7.tar.gz
da783e8c7ca6713e6812b4f0a893348a9679a524bb374e2b6a4b05b2cf2f1e7f  waypoint-openwrt-armv6.tar.gz
1a274ec6e491863352c55ba3b11b10654d7caf6d38695afa67ce2fe047314878  waypoint-openwrt-x86_64.tar.gz
```

---

## 🔧 Package Contents

Each release `.tar.gz` bundle contains everything required for automated installation and daemon lifecycle management:

```
waypoint-openwrt-<arch>/
├── install.sh      # Universal procd installer & auto-dependency resolver
├── uninstall.sh    # Clean removal script
├── vpnctl          # Native OpenWrt UCI & PBR routing companion CLI
├── waypoint        # Compact native Rust binary with embedded Vite PWA
└── waypoint.init   # Procd /etc/init.d/waypoint system service
```

---

## 🚪 Post-Installation Access

Once installed, open your browser and navigate to:
👉 **`http://<router-ip>:8443`** (e.g. `http://192.168.10.1:8443` or `http://192.168.1.1:8443`)
