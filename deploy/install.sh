#!/bin/sh
# ==============================================================================
# WayPoint WRT — Universal OpenWrt Zero-Touch Installer
# Works on: OpenWrt 21.02 / 22.03 / 23.05 / 24.10 / 25.x
# Target Architectures: MIPS, ARM64, ARMv7, ARMv6, x86_64
# ==============================================================================

set -e

echo "================================================="
echo "   WayPoint WRT — Universal OpenWrt Installer    "
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

# 4. Check & Install Prerequisites (wireguard, pbr, openssl, stunnel)
echo "[*] Checking and resolving prerequisites..."
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
    echo "[*] Updating package index and installing dependencies..."
    if command -v apk >/dev/null 2>&1; then
        apk update
        apk add $MISSING_PKGS || echo "[!] Notice: Some packages may already be bundled or unavailable."
    elif command -v opkg >/dev/null 2>&1; then
        opkg update
        opkg install $MISSING_PKGS || echo "[!] Notice: Some packages may already be bundled or unavailable."
    else
        echo "[!] Neither opkg nor apk found. Please ensure WireGuard, PBR, and stunnel are installed manually."
    fi
else
    echo "[+] All prerequisite packages are installed."
fi

# 5. Ensure WireGuard Kernel Module is Loaded
if ! lsmod | grep -q wireguard; then
    echo "[*] Loading WireGuard kernel module..."
    modprobe wireguard >/dev/null 2>&1 || true
fi

# 6. Automated Policy-Based Routing (pbr) Setup & Activation
echo "[*] Configuring and activating Policy-Based Routing (pbr)..."
if [ ! -f /etc/config/pbr ]; then
    touch /etc/config/pbr
fi

if ! uci -q get pbr.config >/dev/null 2>&1; then
    uci -q set pbr.config=pbr
fi
uci -q set pbr.config.enabled='1'
uci -q set pbr.config.strict_enforcement='1'
if command -v nft >/dev/null 2>&1 && dnsmasq --version 2>/dev/null | grep -qw 'nftset'; then
    uci -q set pbr.config.resolver_set='dnsmasq.nftset'
else
    uci -q set pbr.config.resolver_set='none'
fi
uci commit pbr

if [ -x /etc/init.d/pbr ]; then
    /etc/init.d/pbr enable
    /etc/init.d/pbr restart >/dev/null 2>&1 || /etc/init.d/pbr start >/dev/null 2>&1 || true
    echo "[+] Policy-Based Routing (pbr) is enabled and running."
fi

# 7. Stop Existing Service If Running
SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd || echo "")"
if [ -f /etc/init.d/waypoint ]; then
    echo "[*] Stopping existing waypoint service..."
    /etc/init.d/waypoint stop 2>/dev/null || true
fi

# 8. Acquire & Install Binaries and Service
if [ ! -f "$SCRIPT_DIR/waypoint" ] || [ ! -f "$SCRIPT_DIR/vpnctl" ]; then
    echo "[*] Local binaries not found in script directory. Downloading precompiled package for $ARCH from GitHub..."
    PKG_NAME=""
    case "$ARCH" in
        mips) PKG_NAME="waypoint-openwrt-mips" ;;
        mipsel) PKG_NAME="waypoint-openwrt-mipsel" ;;
        aarch64|arm64) PKG_NAME="waypoint-openwrt-aarch64" ;;
        armv7*) PKG_NAME="waypoint-openwrt-armv7" ;;
        arm*|armv6*) PKG_NAME="waypoint-openwrt-armv6" ;;
        x86_64|amd64) PKG_NAME="waypoint-openwrt-x86_64" ;;
        *)
            echo "[-] Error: Unsupported architecture: $ARCH"
            exit 1
            ;;
    esac

    TMP_DIR="/tmp/waypoint_pkg_$$"
    mkdir -p "$TMP_DIR"
    TAR_URL="https://github.com/lucian-sins/waypoint/releases/latest/download/${PKG_NAME}.tar.gz"
    echo "[*] Fetching ${TAR_URL}..."

    FETCHED="false"
    if command -v curl >/dev/null 2>&1; then
        curl -sSL "$TAR_URL" -o "$TMP_DIR/pkg.tar.gz" && FETCHED="true"
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$TMP_DIR/pkg.tar.gz" "$TAR_URL" && FETCHED="true"
    elif command -v uclient-fetch >/dev/null 2>&1; then
        uclient-fetch -q -O "$TMP_DIR/pkg.tar.gz" "$TAR_URL" && FETCHED="true"
    fi

    if [ "$FETCHED" != "true" ] || [ ! -s "$TMP_DIR/pkg.tar.gz" ]; then
        echo "[-] Error: Failed to download release archive for $ARCH."
        rm -rf "$TMP_DIR"
        exit 1
    fi

    tar -xzf "$TMP_DIR/pkg.tar.gz" -C "$TMP_DIR"
    SCRIPT_DIR="$TMP_DIR/$PKG_NAME"
fi

echo "[*] Installing waypoint daemon to /usr/bin/waypoint..."
cp "$SCRIPT_DIR/waypoint" /usr/bin/waypoint
chmod +x /usr/bin/waypoint

echo "[*] Installing vpnctl companion to /usr/sbin/vpnctl..."
cp "$SCRIPT_DIR/vpnctl" /usr/sbin/vpnctl
chmod +x /usr/sbin/vpnctl

echo "[*] Installing init service to /etc/init.d/waypoint..."
cp "$SCRIPT_DIR/waypoint.init" /etc/init.d/waypoint
chmod +x /etc/init.d/waypoint

# Clean up temporary download directory if used
[ -d "/tmp/waypoint_pkg_$$" ] && rm -rf "/tmp/waypoint_pkg_$$"

# 9. Detect Network Environment & Host Info
ROUTER_IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')
[ -z "$ROUTER_IP" ] && ROUTER_IP=$(uci -q get network.lan.ipaddr || echo "192.168.1.1")
ROUTER_HOST=$(uci -q get system.@system[0].hostname || echo "openwrt")

# 10. Automated SSL / TLS & stunnel Provisioning
echo "[*] Provisioning TLS certificate & stunnel HTTPS termination..."
SSL_DIR="/etc/waypoint/ssl"
mkdir -p "$SSL_DIR"
chmod 700 "$SSL_DIR"

TARGET_PORT="8443"

if [ ! -f "$SSL_DIR/waypoint.crt" ] || [ ! -f "$SSL_DIR/waypoint.key" ]; then
    echo "[*] Generating zero-touch EC P-256 TLS certificate for ${ROUTER_IP} / ${ROUTER_HOST}.lan..."
    if command -v openssl >/dev/null 2>&1; then
        SAN_DIRECTIVE="IP:${ROUTER_IP},IP:127.0.0.1,DNS:${ROUTER_HOST},DNS:${ROUTER_HOST}.lan,DNS:localhost"
        openssl req -x509 -nodes -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
            -keyout "$SSL_DIR/waypoint.key" \
            -out "$SSL_DIR/waypoint.crt" \
            -days 3650 \
            -subj "/CN=${ROUTER_IP}/O=WayPoint WRT/C=US" \
            -addext "subjectAltName=${SAN_DIRECTIVE}" >/dev/null 2>&1 || \
        openssl req -x509 -nodes -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
            -keyout "$SSL_DIR/waypoint.key" \
            -out "$SSL_DIR/waypoint.crt" \
            -days 3650 \
            -subj "/CN=${ROUTER_IP}/O=WayPoint WRT/C=US" >/dev/null 2>&1 || true
        
        chmod 600 "$SSL_DIR/waypoint.key"
        chmod 644 "$SSL_DIR/waypoint.crt"
    fi
fi

SSL_READY="false"
if command -v stunnel >/dev/null 2>&1 && [ -f "$SSL_DIR/waypoint.crt" ] && [ -f "$SSL_DIR/waypoint.key" ]; then
    cat <<EOF > "$SSL_DIR/stunnel.conf"
pid = /var/run/waypoint-stunnel.pid
foreground = no
output = /var/log/stunnel.log

[waypoint-https]
accept = 0.0.0.0:${TARGET_PORT}
connect = 127.0.0.1:8440
cert = $SSL_DIR/waypoint.crt
key = $SSL_DIR/waypoint.key
EOF
    SSL_READY="true"
    echo "[+] stunnel HTTPS proxy configured on port ${TARGET_PORT}."
fi

mkdir -p /etc/waypoint
if [ ! -f /etc/waypoint/settings.json ]; then
    cat <<EOF > /etc/waypoint/settings.json
{
  "port": ${TARGET_PORT},
  "ssl_enabled": ${SSL_READY}
}
EOF
else
    if [ "$SSL_READY" = "true" ]; then
        sed -i 's/"ssl_enabled":[ ]*[a-z]*/"ssl_enabled": true/' /etc/waypoint/settings.json
    fi
fi

# 11. Security Check: Prompt for OpenWrt Root Password if Unset
ROOT_SHADOW=$(grep '^root:' /etc/shadow 2>/dev/null | cut -d: -f2)
if [ -z "$ROOT_SHADOW" ] || [ "$ROOT_SHADOW" = "*" ] || [ "$ROOT_SHADOW" = "!" ]; then
    if [ -t 0 ]; then
        echo ""
        echo "=========================================================="
        echo "[!] Security notice: Your OpenWrt router has no root password set."
        printf "Would you like to set an OpenWrt root password now? [y/N]: "
        read -r SET_PASS
        case "$SET_PASS" in
            [yY][eE][sS]|[yY])
                passwd root || true
                ;;
            *)
                echo "[*] Skipping password setup. You can set it later via 'passwd'."
                ;;
        esac
    else
        echo "[!] Security notice: OpenWrt root password is not set. We recommend running 'passwd'."
    fi
fi

# 12. Enable and Start WayPoint Service
echo "[*] Enabling and starting waypoint service..."
/etc/init.d/waypoint enable
/etc/init.d/waypoint restart

# 13. Verify Daemon and stunnel Status
sleep 1.5

WAYPOINT_RUNNING="false"
ps | grep -v grep | grep -q "/usr/bin/waypoint" && WAYPOINT_RUNNING="true"

STUNNEL_RUNNING="false"
pgrep stunnel >/dev/null 2>&1 && STUNNEL_RUNNING="true"

echo ""
echo "========================================================"
if [ "$WAYPOINT_RUNNING" = "true" ]; then
    echo "  🎉 WayPoint WRT successfully installed and running!"
    echo ""
    if [ "$STUNNEL_RUNNING" = "true" ]; then
        echo "  🔒 Secure Web UI (HTTPS): https://${ROUTER_IP}:${TARGET_PORT}"
        echo "  🌐 Local Fallback (HTTP): http://${ROUTER_IP}:8440"
        echo "  (Accept the self-signed certificate in your browser on first visit)"
    else
        echo "  🌐 Web UI (HTTP): http://${ROUTER_IP}:${TARGET_PORT}"
    fi
    echo "  🛡️ Policy-Based Routing: Active"
    echo "========================================================"
else
    echo "[-] Warning: WayPoint process not detected after start."
    echo "    Check logs: cat /var/log/waypoint.log or 'logread'"
    echo "========================================================"
fi
