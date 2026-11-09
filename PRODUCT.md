# WayPoint Product Context

## Vision & Purpose
WayPoint is a lightweight, real-time Progressive Web App (PWA) controller designed to give users granular, 1-tap policy-based routing over their local home network. Connected directly to an OpenWrt router (TP-Link ER605 v2 and compatible OpenWrt gateways), it allows individual LAN devices to be routed either directly to the WAN or through encrypted multi-region WireGuard tunnels.

## Target User & Context
- **Primary User**: Home lab enthusiasts, privacy-conscious users, and families looking to effortlessly bypass geo-restrictions or isolate devices behind specific VPN relays without router restarts or manual iptables/nftables editing.
- **Operating Context**: Accessed from desktop browsers, tablets, and smartphones (iOS/Android PWA standalone mode) on the local subnet (`192.168.10.0/24`).

## Core Capabilities
- **Per-Device Routing**: Instant switching between `Direct` WAN and active WireGuard endpoints (`wgus`, `wges`, `wgjp`, etc.) using OpenWrt Policy-Based Routing (`pbr`).
- **Telemetry & Health**: Real-time handshake age, RX/TX bandwidth counters, live ping RTT latency per WireGuard endpoint, and WAN gateway status.
- **Strict Killswitch**: Hardware-enforced traffic dropping if a tunnel drops, preventing unencrypted IP leakage.
- **Direct WireGuard .conf Import**: Drag-and-drop or paste standard WireGuard `.conf` files to provision UCI network interfaces, peers, and firewall zones with 1 click.
- **Hardware Vendor Recognition**: Instant IEEE OUI and Private/Randomized MAC detection to identify nameless devices (smart plugs, IoT, printers, TVs) and provide 1-click smart rename suggestions.

## Key Constraints & Commitments
- **Zero Mock Data**: 100% live router telemetry over SSH via `/usr/sbin/vpnctl`.
- **Non-Disruptive Routing**: Device policy switching flushes flows and updates `pbr` without rebooting the router or interrupting other active devices.
- **Surface Mode**: **Operate** (Product UI). Prioritizes clean scanability, earned familiarity, and responsive control.
- **Light & Dark Theme Parity**: Strict adherence to refined light mode styling (avoiding pitch black elements in light theme) and deep zinc/neutral dark mode.
