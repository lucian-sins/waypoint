import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Wifi,
  Lock,
  Radio,
  ArrowRight,
} from 'lucide-react';
import type { Tunnel, RouterStatus } from '../lib/types';
import { FlagIcon } from './FlagIcon';
import { CopyButton } from './CopyButton';

interface EgressInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: RouterStatus | null;
  tunnels: Tunnel[];
  onToggleKillSwitch?: () => void;
}

interface EgressData {
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  region: string;
  isp: string;
  org: string;
  asn?: number | string;
  flagEmoji?: string;
}

export const EgressInspectorModal: React.FC<EgressInspectorModalProps> = ({
  isOpen,
  onClose,
  status,
  tunnels,
  onToggleKillSwitch,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EgressData | null>(null);
  const [testTime, setTestTime] = useState<string | null>(null);

  const fetchClientEgress = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Try ipwho.is (CORS enabled, full geolocation + ASN/ISP)
      const res = await fetch('https://ipwho.is/', {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success !== false) {
          setData({
            ip: json.ip,
            country: json.country || 'Unknown',
            countryCode: json.country_code || '',
            city: json.city || '',
            region: json.region || '',
            isp: json.connection?.isp || json.connection?.org || 'Unknown Provider',
            org: json.connection?.org || '',
            asn: json.connection?.asn,
            flagEmoji: json.flag?.emoji,
          });
          setTestTime(new Date().toLocaleTimeString());
          return;
        }
      }

      // 2. Fallback to ipapi.co
      const fallback = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (fallback.ok) {
        const fJson = await fallback.json();
        setData({
          ip: fJson.ip,
          country: fJson.country_name || fJson.country || 'Unknown',
          countryCode: fJson.country_code || '',
          city: fJson.city || '',
          region: fJson.region || '',
          isp: fJson.org || 'Unknown Provider',
          org: fJson.org || '',
          asn: fJson.asn,
        });
        setTestTime(new Date().toLocaleTimeString());
        return;
      }

      throw new Error('Egress lookup failed. Check your internet connection.');
    } catch (err: any) {
      console.warn('Egress test error:', err);
      setError(err.message || 'Could not verify client egress. Ensure ad-blockers allow ipwho.is.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchClientEgress();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Analysis of Egress Route Match
  const routerWanIp = status?.router.wan_ip;
  const isDirectHomeWan = !!(routerWanIp && data?.ip && (data.ip === routerWanIp || data.ip.startsWith(routerWanIp.split('.').slice(0, 3).join('.'))));

  // Check if client egress matches any configured WireGuard tunnel
  const matchedTunnel = tunnels.find((t) => {
    if (!data?.ip) return false;
    const endpointHost = t.endpoint ? t.endpoint.split(':')[0] : null;
    if (endpointHost && data.ip === endpointHost) return true;
    // Also check country match
    const tunnelCountry = t.id.replace(/^wg/, '').toUpperCase();
    if (t.country_code && t.country_code.toUpperCase() === data.countryCode.toUpperCase()) return true;
    if (tunnelCountry.length === 2 && tunnelCountry === data.countryCode.toUpperCase()) return true;
    return false;
  });

  const isVpnProtected = !isDirectHomeWan && !!matchedTunnel;
  const isStrictEnforced = status?.pbr.strict ?? true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#232733] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>Client Egress & Route Inspector</span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Live verification of this browser's real public egress and tunnel match
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Loading State */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Inspecting public egress route...
              </div>
              <p className="text-xs text-neutral-500 max-w-xs">
                Querying external verification nodes to determine your public IP, ISP ASN, and WireGuard route match.
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Verification Failed</span>
              </div>
              <p className="text-xs leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={fetchClientEgress}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium cursor-pointer transition-colors"
              >
                Retry Test
              </button>
            </div>
          )}

          {/* Verified Egress Results */}
          {!loading && data && (
            <>
              {/* Primary Route Status Hero Banner */}
              <div
                className={`p-5 rounded-3xl border transition-all ${
                  isVpnProtected
                    ? 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/30'
                    : isDirectHomeWan
                    ? 'bg-neutral-100 dark:bg-neutral-800/80 border-black/[0.06] dark:border-white/[0.08]'
                    : 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isVpnProtected
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                          : isDirectHomeWan
                          ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                          : 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      }`}
                    >
                      {isVpnProtected ? (
                        <ShieldCheck className="w-6 h-6" />
                      ) : isDirectHomeWan ? (
                        <Wifi className="w-6 h-6" />
                      ) : (
                        <CheckCircle2 className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Current Egress Route
                      </div>
                      <div className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
                        {isVpnProtected
                          ? `Protected via ${matchedTunnel?.label || 'WireGuard Tunnel'}`
                          : isDirectHomeWan
                          ? 'Direct Home WAN (Unrouted)'
                          : `Public Egress: ${data.country}`}
                      </div>
                    </div>
                  </div>

                  {data.countryCode && (
                    <div className="shrink-0">
                      <FlagIcon countryCode={data.countryCode} size="md" />
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300">
                  <span className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">IP:</span>
                    <span>{data.ip}</span>
                    <CopyButton text={data.ip} size="xs" />
                  </span>
                  {testTime && (
                    <span className="text-[11px] text-neutral-400">Tested at {testTime}</span>
                  )}
                </div>
              </div>

              {/* Technical Inspection Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                    Geographic Location
                  </span>
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-1">
                    {[data.city, data.region, data.country].filter(Boolean).join(', ') || '—'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                    Internet Service Provider
                  </span>
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-1 truncate">
                    {data.isp} {data.asn ? `(AS${data.asn})` : ''}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                    Router Gateway WAN
                  </span>
                  <p className="text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200 mt-1 truncate">
                    {routerWanIp || 'Unknown'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                    Router Strict Killswitch
                  </span>
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-1 flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isStrictEnforced ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span>{isStrictEnforced ? 'Enforced (Leak-proof)' : 'Inactive (Direct Fallback)'}</span>
                  </p>
                </div>
              </div>

              {/* Killswitch & Security Recommendations */}
              <div className="p-4 rounded-2xl bg-neutral-100/60 dark:bg-neutral-800/40 border border-black/[0.04] dark:border-white/[0.05] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-500" />
                    <span>PBR Strict Enforcement</span>
                  </span>
                  {onToggleKillSwitch && (
                    <button
                      type="button"
                      onClick={onToggleKillSwitch}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isStrictEnforced
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
                      }`}
                    >
                      {isStrictEnforced ? 'Kill Switch: Active' : 'Kill Switch: Off'}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  When enabled, if your assigned WireGuard tunnel disconnects, your router immediately drops all outbound traffic for that device, preventing any DNS or IP leaks to your real ISP.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-[#1f232d]">
          <button
            type="button"
            onClick={fetchClientEgress}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Test Egress Again</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
