import React, { useState } from 'react';
import {
  Plus,
  Upload,
  ArrowDown,
  ArrowUp,
  Power,
  Loader2,
  Activity,
  ChevronDown,
} from 'lucide-react';
import type { Tunnel, Device } from '../lib/types';
import { formatBytes, formatHandshakeAge } from '../lib/formatters';
import { getTunnelFlag } from '../lib/locations';
import { FlagIcon } from './FlagIcon';

interface TunnelOverviewProps {
  tunnels: Tunnel[];
  devices?: Device[];
  onToggleTunnel: (id: string, up: boolean) => Promise<void>;
  mutatingTunnelId: string | null;
  onOpenAddModal: (mode?: 'conf' | 'manual') => void;
  onRefreshLatencies?: () => Promise<void>;
}

export const TunnelOverview: React.FC<TunnelOverviewProps> = ({
  tunnels,
  devices = [],
  onToggleTunnel,
  mutatingTunnelId,
  onOpenAddModal,
  onRefreshLatencies,
}) => {
  const [pinging, setPinging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('waypoint_locations_collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('waypoint_locations_collapsed', String(next));
      }
      return next;
    });
  };

  const handlePingAll = async () => {
    if (!onRefreshLatencies || pinging) return;
    setPinging(true);
    try {
      await onRefreshLatencies();
    } finally {
      setPinging(false);
    }
  };

  const getLatencyBadge = (latency: number | null | undefined, isUp: boolean) => {
    if (!isUp || latency === null || latency === undefined) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-200 dark:border-neutral-700">
          <span>offline</span>
        </span>
      );
    }

    let colorClasses = '';
    let quality = '';
    if (latency <= 45) {
      colorClasses = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
      quality = 'Fast';
    } else if (latency <= 110) {
      colorClasses = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
      quality = 'Fair';
    } else {
      colorClasses = 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20';
      quality = 'High';
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${colorClasses}`}
        title={`Average RTT latency: ${latency}ms (${quality})`}
      >
        <span className="relative flex h-1.5 w-1.5">
          {latency <= 45 && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
              latency <= 45 ? 'bg-emerald-500' : latency <= 110 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
          />
        </span>
        <span>{latency} ms</span>
      </span>
    );
  };

  const activeCount = tunnels.filter((t) => t.state === 'up').length;

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggleCollapse}
          className="flex items-center gap-2.5 text-left cursor-pointer select-none group rounded-2xl hover:opacity-90 transition-opacity"
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Click to expand WireGuard locations' : 'Click to collapse WireGuard locations'}
        >
          <div className="w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors shrink-0">
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isCollapsed ? '-rotate-90 text-neutral-400' : 'rotate-0 text-blue-600 dark:text-blue-400'
              }`}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
              <span>WireGuard Locations</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                {activeCount} of {tunnels.length} Active
              </span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isCollapsed
                ? 'Section collapsed • Click to expand endpoint cards'
                : 'Encrypted relay endpoints with live average latency telemetry'}
            </p>
          </div>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Ping All Tunnels Button */}
          {onRefreshLatencies && (
            <button
              onClick={handlePingAll}
              disabled={pinging}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer touch-press disabled:opacity-50"
              title="Ping all endpoints to check live latency"
            >
              <Activity className={`w-3.5 h-3.5 ${pinging ? 'animate-spin text-blue-600' : ''}`} />
              <span>{pinging ? 'Pinging...' : 'Test Latency'}</span>
            </button>
          )}

          {/* Import .conf Button */}
          <button
            onClick={() => onOpenAddModal('conf')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer touch-press"
            title="Import WireGuard .conf file directly"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import .conf</span>
          </button>

          {/* Add Location Button */}
          <button
            onClick={() => onOpenAddModal('manual')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-100/80 transition-colors cursor-pointer touch-press"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Location</span>
          </button>
        </div>
      </div>

      {/* Collapsed Horizontal Quick-Summary Strip */}
      {isCollapsed && tunnels.length > 0 && (
        <div
          onClick={toggleCollapse}
          className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none cursor-pointer group animate-in fade-in duration-200"
          title="Click to expand WireGuard location cards"
        >
          {tunnels.map((tunnel) => (
            <div
              key={tunnel.id}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs border font-medium transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600 ${
                tunnel.state === 'up'
                  ? 'bg-white dark:bg-[#232733] border-black/[0.06] dark:border-white/[0.08] text-neutral-800 dark:text-neutral-200 shadow-2xs'
                  : 'bg-neutral-100/80 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-400'
              }`}
            >
              <FlagIcon
                tunnelId={tunnel.id}
                countryCode={tunnel.country_code}
                label={tunnel.label}
                flag={tunnel.flag}
                size="sm"
              />
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {tunnel.label.split('/')[0]?.trim() || tunnel.label}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  tunnel.state === 'up' ? 'bg-emerald-500' : 'bg-neutral-400'
                }`}
                title={tunnel.state === 'up' ? 'Active' : 'Offline'}
              />
              {tunnel.latency_ms && tunnel.state === 'up' && (
                <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                  {tunnel.latency_ms}ms
                </span>
              )}
            </div>
          ))}
          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold px-2 py-1 shrink-0 group-hover:underline">
            Expand ↓
          </span>
        </div>
      )}

      {/* Expanded Cards Grid */}
      {!isCollapsed && (
        <div className="animate-in fade-in duration-200 space-y-4">
          {tunnels.length === 0 ? (
            <div className="space-y-3">
              <div className="p-6 rounded-3xl bg-white dark:bg-[#232733] border border-black/[0.06] dark:border-white/[0.08] text-center space-y-1.5">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  No WireGuard Tunnels Found on Router
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                  Your OpenWrt router does not have any WireGuard interfaces active. Import a WireGuard .conf file or configure a location manually to begin routing devices.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => onOpenAddModal('conf')}
                  className="rounded-3xl p-5 border-2 border-dashed border-emerald-300 dark:border-emerald-800/70 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Import .conf File
                    </span>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Drag and drop or paste any WireGuard configuration
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => onOpenAddModal('manual')}
                  className="rounded-3xl p-5 border-2 border-dashed border-neutral-300 dark:border-neutral-700/80 hover:border-blue-500/60 dark:hover:border-blue-400/60 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 group-hover:bg-blue-500/10 text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-center transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Add Location Manually
                    </span>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                      Pick a country preset or enter peer endpoint
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {tunnels.map((tunnel) => {
          const isUp = tunnel.state === 'up';
          const isMutating = mutatingTunnelId === tunnel.id;
          const isFreshHandshake = tunnel.handshake_age_s < 120;
          const routedDevices = devices.filter(
            (d) => d.tunnel === tunnel.id || tunnel.devices.includes(d.ip)
          );

          return (
            <div
              key={tunnel.id}
              className="rounded-3xl p-5 bg-white dark:bg-[#232733] border border-black/[0.06] dark:border-white/[0.08] shadow-sm hover:shadow-md transition-all space-y-4"
            >
              {/* Card Header: Flag/Label + Latency Badge + Power toggle */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xl border select-none ${
                      isUp
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400'
                    }`}
                  >
                    <FlagIcon
                      tunnelId={tunnel.id}
                      countryCode={tunnel.country_code}
                      label={tunnel.label}
                      flag={tunnel.flag}
                      size="lg"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                        {tunnel.label}
                      </h3>
                      <span className="text-[10px] font-mono text-neutral-400 uppercase">
                        {tunnel.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      <span className="font-mono text-[11px]">{tunnel.endpoint}</span>
                    </div>
                  </div>
                </div>

                {/* Right Header: Latency & Power Button */}
                <div className="flex items-center gap-2">
                  {getLatencyBadge(tunnel.latency_ms, isUp)}

                  {/* Up/Down Power Button */}
                  <button
                    onClick={() => onToggleTunnel(tunnel.id, !isUp)}
                    disabled={isMutating}
                    title={`Turn tunnel ${isUp ? 'down' : 'up'}`}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer touch-press ${
                      isUp
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
                    }`}
                  >
                    {isMutating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Telemetry Row: Handshake + Devices Routed + Latency */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-black/[0.04] dark:border-white/[0.05] text-xs">
                <div>
                  <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-medium tracking-wider">
                    Handshake
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isUp && isFreshHandshake
                          ? 'bg-emerald-500 animate-pulse'
                          : isUp
                          ? 'bg-amber-500'
                          : 'bg-neutral-400'
                      }`}
                    />
                    <span className="truncate">{isUp ? formatHandshakeAge(tunnel.handshake_age_s) : 'Offline'}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-medium tracking-wider">
                    Avg Latency
                  </div>
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {isUp && tunnel.latency_ms ? (
                      <span className="font-mono tabular-nums">{tunnel.latency_ms} ms</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-medium tracking-wider">
                    Devices
                  </div>
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {tunnel.devices.length} {tunnel.devices.length === 1 ? 'device' : 'devices'}
                  </div>
                </div>
              </div>

              {/* Data Transfer Counters */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/60 text-xs">
                <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                  <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>RX:</span>
                  <span className="font-mono tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                    {formatBytes(tunnel.rx_bytes)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                  <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>TX:</span>
                  <span className="font-mono tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                    {formatBytes(tunnel.tx_bytes)}
                  </span>
                </div>
              </div>

              {/* Routed Devices Breakdown (Traffic consumed per device on this location) */}
              {routedDevices.length > 0 && (
                <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.05] space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    <span>Active Device Consumption</span>
                    <span>{routedDevices.length} {routedDevices.length === 1 ? 'client' : 'clients'}</span>
                  </div>
                  <div className="space-y-1.5">
                    {routedDevices.map((dev) => (
                      <div
                        key={dev.ip}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 text-xs border border-black/[0.03] dark:border-white/[0.03]"
                      >
                        <div className="flex items-center gap-2 truncate mr-2 min-w-0">
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {dev.name}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                            {dev.ip}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                          <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center">
                            <ArrowDown className="w-2.5 h-2.5 mr-0.5" />
                            {formatBytes(dev.rx_bytes)}
                          </span>
                          <span className="text-neutral-300 dark:text-neutral-600">/</span>
                          <span className="text-blue-600 dark:text-blue-400 inline-flex items-center">
                            <ArrowUp className="w-2.5 h-2.5 mr-0.5" />
                            {formatBytes(dev.tx_bytes)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Location Action Card */}
        <button
          onClick={() => onOpenAddModal('conf')}
          className="rounded-3xl p-5 border-2 border-dashed border-neutral-300 dark:border-neutral-700/80 hover:border-emerald-500/60 dark:hover:border-emerald-400/60 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex flex-col items-center justify-center text-center gap-2 group cursor-pointer min-h-[160px]"
        >
          <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 group-hover:bg-emerald-500/10 text-neutral-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-center transition-colors">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Import .conf or Add Location
            </span>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              Drop a WireGuard config file or pick a preset
            </p>
          </div>
        </button>
      </div>
          )}
        </div>
      )}
    </section>
  );
};
