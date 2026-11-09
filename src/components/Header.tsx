import React from 'react';
import { ShieldCheck, RefreshCw, Moon, Sun, Server, Settings, Waypoints, Globe } from 'lucide-react';
import type { RouterStatus } from '../lib/types';

interface HeaderProps {
  status: RouterStatus | null;
  loading: boolean;
  onRefresh: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSettings: (tab?: 'subnets' | 'relays' | 'router' | 'security') => void;
  onGoHome?: () => void;
  routerMode: string;
  onToggleStrictPbr?: () => void;
  onOpenEgressInspector?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  loading,
  onRefresh,
  isDark,
  onToggleTheme,
  onOpenSettings,
  onGoHome,
  routerMode,
  onToggleStrictPbr,
  onOpenEgressInspector,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#f8f9fa]/85 dark:bg-[#191b22]/85 border-b border-black/[0.06] dark:border-white/[0.08] transition-colors safe-top">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Router Name */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoHome}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/10 via-sky-500/10 to-indigo-500/10 dark:from-blue-400/15 dark:via-sky-400/10 dark:to-indigo-400/15 border border-blue-500/20 dark:border-blue-400/25 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:scale-105 active:scale-95 transition-all cursor-pointer focus:outline-none p-2 shadow-sm"
            title="Return to Overview"
          >
            <svg viewBox="0 0 512 512" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M256 160 L256 118" stroke="currentColor" strokeWidth="26" strokeLinecap="round" />
              <path d="M236 138 L256 118 L276 138" stroke="currentColor" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M130 186 L194 346 L256 224 L318 346 L382 186" stroke="currentColor" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="130" cy="186" r="30" fill="currentColor" />
              <circle cx="194" cy="346" r="28" fill="currentColor" />
              <circle cx="256" cy="224" r="34" fill="currentColor" />
              <circle cx="318" cy="346" r="28" fill="currentColor" />
              <circle cx="382" cy="186" r="30" fill="currentColor" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onGoHome}
                className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left focus:outline-none"
                title="Return to Overview"
              >
                WayPoint
              </button>
              {status ? (
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Live: {status.router.wan_ip || 'Connected'}
                </span>
              ) : (
                <button
                  onClick={() => onOpenSettings('router')}
                  className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Click to configure router SSH connection in Settings"
                >
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  <span>Connect Router (⚙)</span>
                </button>
              )}
            </div>
            {status ? (
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  WAN Online
                </span>
                <span>·</span>
                <span>OpenWrt {status.router.release}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="inline-flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                  <span className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600"></span>
                  Offline · Awaiting Setup
                </span>
                <span>·</span>
                <span>OpenWrt</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Egress Route Verification Button */}
          {onOpenEgressInspector && (
            <button
              type="button"
              onClick={onOpenEgressInspector}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-neutral-200 border border-black/[0.06] dark:border-white/[0.08] shadow-2xs transition-colors cursor-pointer"
              title="Verify public egress IP and WireGuard route match from this browser"
            >
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Verify Route</span>
            </button>
          )}

          {/* Strict Killswitch Toggle Pill */}
          {status && (
            <button
              type="button"
              onClick={onToggleStrictPbr}
              disabled={!onToggleStrictPbr}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                status.pbr.strict
                  ? 'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 border-amber-500/25 hover:bg-amber-500/20'
              }`}
              title={
                status.pbr.strict
                  ? 'Strict Kill Switch is ACTIVE: Traffic is dropped immediately if VPN disconnects (tap to disable)'
                  : 'Strict Kill Switch is OFF: Devices will failover to direct WAN if VPN disconnects (tap to enable)'
              }
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{status.pbr.strict ? 'Kill Switch: Strict' : 'Kill Switch: Off'}</span>
            </button>
          )}

          {/* Refresh Button with 360 Spin */}
          <button
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh network status"
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors touch-press cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors touch-press cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => onOpenSettings('subnets')}
            aria-label="Open settings"
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors touch-press cursor-pointer"
            title="Settings & CIDR Configuration"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
