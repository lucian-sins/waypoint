#!/bin/sh
# ==============================================================================
# WayPoint — Universal OpenWrt Installer
# Works on: OpenWrt 21.02 / 22.03 / 23.05 / 24.10 / 25.x
# ==============================================================================

set -e

echo "================================================="
echo "   WayPoint — Universal OpenWrt Installer       "
echo "================================================="

# 1. Check Root Privileges
if [ "$(id -u)" != "0" ]; then
    echo "[-] Error: This installer must be run as root."
    exit 1
fi

# 2. Check Architecture
ARCH=$(uname -m)
echo "[*] Detected CPU Architecture: $ARCH"

# 3. Check Available Flash Storage
OVERLAY_FREE_KB=$(df -k /overlay 2>/dev/null | awk 'NR==2 {print $4}')
if [ -n "$OVERLAY_FREE_KB" ]; then
    OVERLAY_FREE_MB=$((OVERLAY_FREE_KB / 1024))
    echo "[*] Overlay free space: ${OVERLAY_FREE_MB} MB"
    if [ "$OVERLAY_FREE_KB" -lt 2500 ]; then
        echo "[!] WARNING: Less than 2.5 MB free in /overlay. Installation might run low on flash space."
    fi
fi

# 4. Check & Install Prerequisites (wireguard, pbr)
echo "[*] Checking prerequisites..."
MISSING_PKGS=""

if ! command -v wg >/dev/null 2>&1; then
    MISSING_PKGS="$MISSING_PKGS wireguard-tools kmod-wireguard"
fi

if ! command -v pbr >/dev/null 2>&1 && [ ! -x /etc/init.d/pbr ]; then
    MISSING_PKGS="$MISSING_PKGS pbr luci-app-pbr"
fi

if ! command -v openssl >/dev/null 2>&1; then
    MISSING_PKGS="$MISSING_PKGS openssl-util"
fi

if ! command -v stunnel >/dev/null 2>&1; then
    MISSING_PKGS="$MISSING_PKGS stunnel"
fi

if [ -n "$MISSING_PKGS" ]; then
    echo "[*] Missing packages detected:$MISSING_PKGS"
    echo "[*] Installing required OpenWrt packages..."
    if command -v apk >/dev/null 2>&1; then
        apk update
        apk add $MISSING_PKGS || echo "[!] Notice: Some packages may already be bundled or unavailable."
    elif command -v opkg >/dev/null 2>&1; then
        opkg update
        opkg install $MISSING_PKGS || echo "[!] Notice: Some packages may already be bundled or unavailable."
    else
        echo "[!] Neither opkg nor apk found. Please ensure WireGuard and PBR are installed manually."
    fi
else
    echo "[+] All prerequisites (wireguard, pbr) are already installed."
fi

# 5. Stop existing service if active
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f /etc/init.d/waypoint ]; then
    echo "[*] Stopping existing waypoint service..."
    /etc/init.d/waypoint stop 2>/dev/null || true
fi

# 6. Install Binaries and Service
echo "[*] Installing waypoint daemon to /usr/bin/waypoint..."
cp "$SCRIPT_DIR/waypoint" /usr/bin/waypoint
chmod +x /usr/bin/waypoint

echo "[*] Installing vpnctl companion to /usr/sbin/vpnctl..."
cp "$SCRIPT_DIR/vpnctl" /usr/sbin/vpnctl
chmod +x /usr/sbin/vpnctl

echo "[*] Installing init service to /etc/init.d/waypoint..."
cp "$SCRIPT_DIR/waypoint.init" /etc/init.d/waypoint
chmod +x /etc/init.d/waypoint

# 7. Enable and Start Procd Service
echo "[*] Enabling and starting waypoint service..."
/etc/init.d/waypoint enable
/etc/init.d/waypoint restart

# 8. Detect LAN IP and Display Welcome Banner
sleep 1
ROUTER_IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')
[ -z "$ROUTER_IP" ] && ROUTER_IP=$(uci -q get network.lan.ipaddr || echo "192.168.1.1")

if ps | grep -v grep | grep -q "/usr/bin/waypoint"; then
    echo ""
    echo "========================================================"
    echo "  🎉 WayPoint successfully installed and running!"
    echo "  Access the Web UI at: http://${ROUTER_IP}:8443"
    echo "========================================================"
else
    echo "[-] Warning: WayPoint process not detected after start."
    echo "    Check logs: cat /var/log/waypoint.log or 'logread'"
fi
