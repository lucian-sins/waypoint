#!/bin/sh
# ==============================================================================
# WayPoint Native OpenWrt Uninstaller
# ==============================================================================

echo "[*] Stopping and disabling waypoint service..."
/etc/init.d/waypoint disable 2>/dev/null || true
/etc/init.d/waypoint stop 2>/dev/null || true
killall waypoint 2>/dev/null || true

echo "[*] Removing installed files..."
rm -f /usr/bin/waypoint
rm -f /usr/sbin/vpnctl
rm -f /etc/init.d/waypoint
rm -f /var/log/waypoint.log

echo "WayPoint has been completely removed."
