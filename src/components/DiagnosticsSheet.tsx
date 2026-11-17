import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Copy, Check, AlertCircle, Info, RefreshCw, ShieldCheck, Globe } from 'lucide-react';
import type { RouterStatus } from '../lib/types';
import { formatUptime } from '../lib/formatters';
import { CopyButton } from './CopyButton';

interface DiagnosticsSheetProps {
  status: RouterStatus | null;
  lastError: string | null;
  onToggleStrictPbr?: () => void;
  onOpenEgressInspector?: () => void;
}

export const DiagnosticsSheet: React.FC<DiagnosticsSheetProps> = ({
  status,
  lastError,
  onToggleStrictPbr,
  onOpenEgressInspector,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState<string | null>(null);

  const handleRecover = async () => {
    setRecovering(true);
    setRecoverMsg(null);
    try {
      const res = await fetch('/api/system/recover', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRecoverMsg('Gateway packet forwarding and locks successfully restored!');
      } else {
        setRecoverMsg(data.error || 'Recovery failed.');
      }
    } catch {
      setRecoverMsg('Failed to contact gateway daemon.');
    } finally {
      setRecovering(false);
    }
  };

  const copyDiagnosticDump = () => {
    const payload = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        status,
        lastError,
      },
      null,
      2
    );

    if (navigator.clipboard) {
      navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-[#232733] border border-black/[0.06] dark:border-white/[0.08] shadow-sm overflow-hidden transition-all">
      {/* Header / Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
              <span>Diagnostics & System Health</span>
              {lastError && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-100 dark:bg-red-950/60 dark:text-red-400 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-2.5 h-2.5" />
                  Router Error Logged
                </span>
              )}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              OpenWrt release, pbr routing status, and live error log
            </p>
          </div>
        </div>
        <div className="text-neutral-400 dark:text-neutral-500">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-5 pt-0 border-t border-black/[0.04] dark:border-white/[0.05] space-y-4 text-xs">
          {/* Emergency Packet Forwarding Warning */}
          {status?.router.ip_forward === false && (
            <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-700 dark:text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <h4 className="font-semibold text-xs text-rose-900 dark:text-rose-100">
                    Kernel Packet Forwarding is Disabled (net.ipv4.ip_forward = 0)
                  </h4>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    Router has WAN access but cannot forward packets for LAN/Wi-Fi devices.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRecover}
                disabled={recovering}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors shrink-0 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recovering ? 'animate-spin' : ''}`} />
                <span>{recovering ? 'Restoring...' : 'Self-Heal Gateway'}</span>
              </button>
            </div>
          )}

          {recoverMsg && (
            <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-between gap-2">
              <span>{recoverMsg}</span>
              <button
                type="button"
                onClick={() => setRecoverMsg(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60">
              <span className="text-[11px] text-neutral-400 uppercase font-medium">Uptime</span>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                {status?.router.uptime_s ? formatUptime(status.router.uptime_s) : '—'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60">
              <span className="text-[11px] text-neutral-400 uppercase font-medium">WAN IP</span>
              <p className="text-sm font-mono font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5 truncate">
                {status?.router.wan_ip || '—'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60">
              <span className="text-[11px] text-neutral-400 uppercase font-medium">PBR Policies</span>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                {status?.pbr.policies ?? '—'} active
              </p>
            </div>
            <div
              role={onToggleStrictPbr ? 'button' : undefined}
              tabIndex={onToggleStrictPbr ? 0 : undefined}
              onClick={onToggleStrictPbr}
              onKeyDown={(e) => {
                if (onToggleStrictPbr && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onToggleStrictPbr();
                }
              }}
              className={`p-3 rounded-2xl border transition-all ${
                onToggleStrictPbr ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
              } ${
                status?.pbr.strict
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/25'
                  : 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/25'
              }`}
              title="Click to toggle Strict Kill Switch mode on router"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-400 uppercase font-medium">Strict Killswitch</span>
                <ShieldCheck
                  className={`w-3.5 h-3.5 ${
                    status?.pbr.strict ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                />
              </div>
              <p
                className={`text-sm font-semibold mt-0.5 ${
                  status?.pbr.strict
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {status?.pbr.strict ? 'Enabled (Strict)' : 'Disabled (Direct)'}
              </p>
            </div>
          </div>

          {/* Verbatim vpnctl output or error */}
          {lastError ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Last Router Execution Error (verbatim):</span>
                </div>
                <CopyButton
                  text={lastError}
                  label="Copy Error"
                  copiedLabel="Copied!"
                  size="xs"
                  className="bg-red-500/15 hover:bg-red-500/25 text-red-700 dark:text-red-300 border-red-500/30"
                />
              </div>
              <pre className="font-mono text-[11px] whitespace-pre-wrap bg-red-950/20 p-2.5 rounded-xl overflow-x-auto select-text">
                {lastError}
              </pre>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-neutral-100/60 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>No errors recorded. All pbr routing policies and WireGuard peers are synchronized.</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleRecover}
                disabled={recovering}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium transition-colors cursor-pointer touch-press disabled:opacity-50"
                title="Clears deadlocked procd locks, ensures kernel packet forwarding is active, and resets fw4 forward chains"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${recovering ? 'animate-spin' : ''}`} />
                <span>{recovering ? 'Healing...' : 'Self-Heal Gateway'}</span>
              </button>

              {onOpenEgressInspector && (
                <button
                  type="button"
                  onClick={onOpenEgressInspector}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-medium transition-colors cursor-pointer touch-press"
                  title="Verify your browser's egress IP and VPN route"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span>Verify Route / Egress</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if ('caches' in window) {
                    caches.keys().then((names) => {
                      for (const name of names) caches.delete(name);
                    });
                  }
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then((regs) => {
                      for (const reg of regs) reg.unregister();
                    });
                  }
                  window.location.href = window.location.origin + '?reload=' + Date.now();
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium transition-colors cursor-pointer touch-press"
                title="Purges PWA Service Worker cache and forces a complete reload"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Force App Reload</span>
              </button>
            </div>

            <button
              onClick={copyDiagnosticDump}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors cursor-pointer touch-press"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy System State'}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
