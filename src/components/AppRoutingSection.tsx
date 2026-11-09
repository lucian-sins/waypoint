import React, { useState, useMemo } from 'react';
import {
  Route,
  Plus,
  Trash2,
  ChevronDown,
  Globe,
  Loader2,
  Layers,
  Check,
  X,
  Laptop,
  Smartphone,
  Tv,
  Search,
  Filter,
  ArrowRight,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';
import type { AppRouteRule, Tunnel, Device } from '../lib/types';
import { APP_PRESETS, type AppPreset, type AppCategory } from '../lib/appPresets';
import { buildTunnelOptions } from '../lib/locations';
import { FlagIcon } from './FlagIcon';
import { ServiceIcon } from './ServiceIcon';

interface AppRoutingSectionProps {
  appRules: AppRouteRule[];
  tunnels: Tunnel[];
  devices: Device[];
  onSaveRule: (rule: {
    id: string;
    name: string;
    serviceKey?: string;
    tunnel: string;
    targetDevice?: string;
    domains: string[];
  }) => Promise<void>;
  onToggleRule: (id: string, enabled: boolean) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
}

export const AppRoutingSection: React.FC<AppRoutingSectionProps> = ({
  appRules,
  tunnels,
  devices,
  onSaveRule,
  onToggleRule,
  onDeleteRule,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('waypoint_app_routing_collapsed') === 'true';
    }
    return false;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'active' | AppCategory>('all');
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [pickerTargetDevice, setPickerTargetDevice] = useState<Record<string, string>>({});

  // Custom rule modal states
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDomains, setCustomDomains] = useState('');
  const [customTunnel, setCustomTunnel] = useState('');
  const [customTargetDevice, setCustomTargetDevice] = useState('all');
  const [savingCustom, setSavingCustom] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('waypoint_app_routing_collapsed', String(next));
      }
      return next;
    });
  };

  const activeCount = useMemo(
    () => appRules.filter((r) => r.enabled && r.tunnel !== 'direct' && r.tunnel !== 'wan').length,
    [appRules]
  );

  // Build destination options (Direct + all available WireGuard relays)
  const tunnelOptions = useMemo(() => buildTunnelOptions(tunnels), [tunnels]);

  // Map presets to their active rule if one exists
  const catalog = useMemo(() => {
    return APP_PRESETS.map((preset) => {
      const matchedRule = appRules.find(
        (r) =>
          r.serviceKey === preset.id ||
          r.id === preset.id ||
          r.id === `app_${preset.id}` ||
          r.id.startsWith(`app_${preset.id}_`) ||
          r.name.toLowerCase() === preset.name.toLowerCase() ||
          r.domains.some((d) => preset.domains.includes(d))
      );
      const isRuleActive =
        !!matchedRule?.enabled &&
        matchedRule.tunnel !== 'direct' &&
        matchedRule.tunnel !== 'wan';

      return {
        preset,
        rule: matchedRule,
        isConfigured: !!matchedRule,
        isActive: isRuleActive,
        tunnelId: matchedRule ? matchedRule.tunnel : 'direct',
      };
    });
  }, [appRules]);

  // Identify any custom rules created by the user that aren't in presets
  const customRules = useMemo(() => {
    return appRules.filter((r) => {
      const isPreset = APP_PRESETS.some(
        (p) =>
          p.id === r.serviceKey ||
          r.id === p.id ||
          r.id === `app_${p.id}` ||
          r.id.startsWith(`app_${p.id}_`) ||
          r.name.toLowerCase() === p.name.toLowerCase() ||
          r.domains.some((d) => p.domains.includes(d))
      );
      return !isPreset;
    });
  }, [appRules]);

  // Filter catalog based on category and search
  const filteredCatalog = useMemo(() => {
    return catalog.filter(({ preset, rule, isActive }) => {
      if (selectedCategory === 'active' && !isActive) return false;
      if (
        selectedCategory !== 'all' &&
        selectedCategory !== 'active' &&
        preset.category !== selectedCategory
      ) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        preset.name.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.domains.some((d) => d.toLowerCase().includes(q))
      );
    });
  }, [catalog, selectedCategory, searchQuery]);

  // Filter custom rules
  const filteredCustomRules = useMemo(() => {
    return customRules.filter((r) => {
      const isRuleActive = r.enabled && r.tunnel !== 'direct' && r.tunnel !== 'wan';
      if (selectedCategory === 'active' && !isRuleActive) return false;
      if (selectedCategory !== 'all' && selectedCategory !== 'active') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        r.name.toLowerCase().includes(q) ||
        r.domains.some((d) => d.toLowerCase().includes(q))
      );
    });
  }, [customRules, selectedCategory, searchQuery]);

  // Handle routing selection for any streaming service
  const handleSelectServiceTunnel = async (
    preset: AppPreset,
    existingRule: AppRouteRule | undefined,
    tunnelId: string
  ) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    setMutatingId(preset.id);
    const targetDev = pickerTargetDevice[preset.id] || existingRule?.targetDevice || 'all';

    try {
      if (tunnelId === 'direct' || tunnelId === 'wan') {
        if (existingRule) {
          await onDeleteRule(existingRule.id);
        }
      } else {
        const id =
          existingRule?.id ||
          `app_${preset.id}_${targetDev === 'all' ? 'all' : targetDev.replace(/[^a-z0-9]/g, '_')}`;

        await onSaveRule({
          id,
          name: preset.name,
          serviceKey: preset.id,
          tunnel: tunnelId,
          targetDevice: targetDev,
          domains: preset.domains,
        });
      }
      setOpenPickerId(null);
    } finally {
      setMutatingId(null);
    }
  };

  // Handle custom rule submission
  const handleSaveCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawDomains = customDomains
      .split(/[\n, ]+/)
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0 && d.includes('.'));

    if (rawDomains.length === 0) {
      alert('Please enter at least one valid domain (e.g. crunchyroll.com).');
      return;
    }

    const name = customName.trim() || 'Custom App';
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const id = `app_${slug}_${customTargetDevice === 'all' ? 'all' : customTargetDevice.replace(/[^a-z0-9]/g, '_')}`;

    setSavingCustom(true);
    try {
      await onSaveRule({
        id,
        name,
        serviceKey: 'custom',
        tunnel: customTunnel,
        targetDevice: customTargetDevice,
        domains: rawDomains,
      });
      setIsCustomModalOpen(false);
      setCustomName('');
      setCustomDomains('');
    } finally {
      setSavingCustom(false);
    }
  };

  const getDeviceLabel = (devIp: string) => {
    if (!devIp || devIp === 'all') return 'All Network Devices';
    const match = devices.find((d) => d.ip === devIp);
    return match ? `${match.name} (${match.ip})` : devIp;
  };

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggleCollapse}
          className="flex items-center gap-2.5 text-left cursor-pointer select-none group rounded-2xl hover:opacity-90 transition-opacity"
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Click to expand App Routing rules' : 'Click to collapse App Routing rules'}
        >
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-colors shrink-0">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
              <span>App & Streaming Routing</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                {activeCount} Active
              </span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isCollapsed
                ? 'Section collapsed • Click to expand selective split-tunneling'
                : 'Selectively route streaming platforms and domains through specific WireGuard relays'}
            </p>
          </div>
        </button>

        {/* Action Button: Custom Domain */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer touch-press"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Custom Domain Rule</span>
          </button>
        </div>
      </div>

      {/* Expanded Controls & Search */}
      {!isCollapsed && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Search bar & Category filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 25 services (Apple TV, Netflix, Hulu, Prime Video, ESPN, DAZN)..."
                className="w-full pl-8 pr-7 py-2 rounded-2xl bg-white dark:bg-[#232733] border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar shrink-0 text-xs">
              {[
                { id: 'all', label: `All (${catalog.length})` },
                { id: 'active', label: `Active (${activeCount})` },
                { id: 'video', label: '🎬 Movies & TV' },
                { id: 'sports', label: '⚽ Sports' },
                { id: 'audio', label: '🎵 Audio' },
                { id: 'gaming', label: '🎮 Gaming' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                      : 'bg-white dark:bg-[#232733] border border-black/[0.05] dark:border-white/[0.06] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {/* Custom Rules (if any match search) */}
            {filteredCustomRules.map((rule) => {
              const isMutating = mutatingId === rule.id;
              const isDeleting = deletingId === rule.id;
              const currentTunnelOpt = tunnelOptions.find((t) => t.id === rule.tunnel);
              const isPickerOpen = openPickerId === rule.id;
              const isRuleActive = rule.enabled && rule.tunnel !== 'direct' && rule.tunnel !== 'wan';

              return (
                <div
                  key={rule.id}
                  className={`rounded-3xl p-5 bg-white dark:bg-[#232733] border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                    isRuleActive
                      ? 'border-blue-500/35 dark:border-blue-500/30 ring-1 ring-blue-500/15'
                      : 'border-black/[0.06] dark:border-white/[0.08] opacity-80'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Layer 1: Top Bar with Globe on left, Route selector badge & Delete on right */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center shrink-0 shadow-2xs">
                        <Globe className="w-5 h-5 text-neutral-500" />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setOpenPickerId(isPickerOpen ? null : rule.id)}
                          disabled={isMutating}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isRuleActive && currentTunnelOpt && !currentTunnelOpt.isDirect
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-600 font-bold'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-black/[0.06] dark:border-white/[0.08]'
                          }`}
                        >
                          {isMutating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isRuleActive && currentTunnelOpt && !currentTunnelOpt.isDirect ? (
                            <>
                              <FlagIcon countryCode={currentTunnelOpt.country_code || currentTunnelOpt.id} size="sm" />
                              <span className="font-bold tracking-tight">{currentTunnelOpt.shortLabel}</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-3.5 h-3.5 text-blue-500" />
                              <span className="font-medium">Direct</span>
                            </>
                          )}
                          <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isPickerOpen ? 'rotate-180 text-blue-600' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            setDeletingId(rule.id);
                            try {
                              await onDeleteRule(rule.id);
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          disabled={isDeleting}
                          className="p-1.5 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Delete rule"
                        >
                          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Layer 2: Full-width Title & Custom Badge */}
                    <div className="flex items-center gap-2 flex-wrap min-w-0 pt-0.5">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-snug truncate">
                        {rule.name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shrink-0">
                        Custom
                      </span>
                    </div>

                    {/* Layer 3: Full-width Domain list */}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 font-mono leading-relaxed">
                      {rule.domains.join(', ')}
                    </p>
                  </div>

                  {/* Layer 4: Clean Footer (when not expanding picker) */}
                  {!isPickerOpen && (
                    <div className="pt-3 mt-3.5 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1.5 truncate">
                        <Tv className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-medium text-neutral-600 dark:text-neutral-300 truncate">
                          Scope: {getDeviceLabel(rule.targetDevice || 'all')}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-neutral-400 shrink-0 ml-2">
                        {rule.domains.length} domains
                      </span>
                    </div>
                  )}

                  {/* Inline Destination Picker */}
                  {isPickerOpen && (
                    <div className="pt-3.5 mt-3.5 border-t border-black/[0.06] dark:border-white/[0.08] animate-in fade-in slide-in-from-top-1 duration-150 space-y-2.5">
                      <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Route traffic destination
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {tunnelOptions.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={async () => {
                              setMutatingId(rule.id);
                              try {
                                await onSaveRule({
                                  ...rule,
                                  tunnel: opt.id,
                                });
                                setOpenPickerId(null);
                              } finally {
                                setMutatingId(null);
                              }
                            }}
                            className={`p-2.5 rounded-2xl text-left border flex items-center gap-2.5 transition-all cursor-pointer text-xs ${
                              rule.tunnel === opt.id
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                                : 'bg-neutral-50 dark:bg-neutral-800/60 border-black/[0.04] dark:border-white/[0.05] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            {opt.isDirect ? (
                              <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                            ) : (
                              <FlagIcon countryCode={opt.country_code || opt.id} size="sm" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate">{opt.shortLabel}</div>
                              <div className="text-[10px] text-neutral-400 truncate mt-0.5">{opt.label}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pre-configured Streaming Service Cards */}
            {filteredCatalog.map(({ preset, rule, isConfigured, isActive, tunnelId }) => {
              const isMutating = mutatingId === preset.id;
              const isPickerOpen = openPickerId === preset.id;
              const currentTunnelOpt = tunnelOptions.find((t) => t.id === tunnelId);
              const targetDevice = pickerTargetDevice[preset.id] || rule?.targetDevice || 'all';

              return (
                <div
                  key={preset.id}
                  className={`rounded-3xl p-5 bg-white dark:bg-[#232733] border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                    isActive
                      ? 'border-blue-500/40 dark:border-blue-500/35 ring-1 ring-blue-500/15'
                      : 'border-black/[0.06] dark:border-white/[0.08]'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Layer 1: Top Bar with Brand Icon on left, Compact Route Button on right */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800/90 border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center shrink-0 shadow-2xs">
                        <ServiceIcon serviceKey={preset.id} name={preset.name} size="md" />
                      </div>

                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setOpenPickerId(isPickerOpen ? null : preset.id)}
                          disabled={isMutating}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer touch-press ${
                            isActive
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-400/80 dark:border-blue-600/80 font-bold shadow-2xs'
                              : 'bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-black/[0.06] dark:border-white/[0.08]'
                          }`}
                        >
                          {isMutating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          ) : isActive && currentTunnelOpt && !currentTunnelOpt.isDirect ? (
                            <>
                              <FlagIcon countryCode={currentTunnelOpt.country_code || currentTunnelOpt.id} size="sm" />
                              <span className="font-bold tracking-tight">{currentTunnelOpt.shortLabel}</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-3.5 h-3.5 text-blue-500" />
                              <span className="font-medium">Direct</span>
                            </>
                          )}
                          <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isPickerOpen ? 'rotate-180 text-blue-600' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Layer 2: Full-width Title & Status */}
                    <div className="flex items-center gap-2 flex-wrap min-w-0 pt-0.5">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-snug truncate">
                        {preset.name}
                      </h3>
                      {isActive && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>

                    {/* Layer 3: Full-width Description */}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>

                  {/* Layer 4: Clean Footer - Scope & Domains (when not expanding picker) */}
                  {!isPickerOpen && (
                    <div className="pt-3 mt-3.5 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1.5 truncate">
                        <Tv className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-500' : 'text-neutral-400'}`} />
                        <span className="font-medium text-neutral-600 dark:text-neutral-300 truncate">
                          {isActive && rule ? `Scope: ${getDeviceLabel(rule.targetDevice || 'all')}` : 'Scope: Entire Home'}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-neutral-400 shrink-0 ml-2">
                        {preset.domains.length} domains
                      </span>
                    </div>
                  )}

                  {/* Inline Destination Picker (Hidden by default, reveals on tap) */}
                  {isPickerOpen && (
                    <div className="pt-3.5 mt-3.5 border-t border-black/[0.06] dark:border-white/[0.08] animate-in fade-in slide-in-from-top-1 duration-150 space-y-3.5">
                      {/* Destination Grid */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          <span>Route Destination</span>
                          <span className="text-[11px] font-normal text-neutral-400">Tap to route</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {tunnelOptions.map((opt) => {
                            const isSelected =
                              (opt.isDirect && (!isActive || tunnelId === 'direct' || tunnelId === 'wan')) ||
                              (!opt.isDirect && isActive && tunnelId === opt.id);

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelectServiceTunnel(preset, rule, opt.id)}
                                className={`p-2.5 rounded-2xl text-left border flex items-center gap-2.5 transition-all cursor-pointer text-xs ${
                                  isSelected
                                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                                    : 'bg-neutral-50 dark:bg-neutral-800/60 border-black/[0.04] dark:border-white/[0.05] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                              >
                                {opt.isDirect ? (
                                  <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                                ) : (
                                  <FlagIcon countryCode={opt.country_code || opt.id} size="sm" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold truncate">{opt.shortLabel}</div>
                                  <div className="text-[10px] text-neutral-400 truncate mt-0.5">{opt.label}</div>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Device Scoping */}
                      <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.06] space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          <span>Applies to</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400 text-[11px] truncate max-w-[150px]">
                            {getDeviceLabel(targetDevice)}
                          </span>
                        </div>
                        <select
                          value={targetDevice}
                          onChange={(e) => {
                            setPickerTargetDevice((prev) => ({
                              ...prev,
                              [preset.id]: e.target.value,
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none cursor-pointer"
                        >
                          <option value="all">All Network Devices (Entire Home)</option>
                          {devices.map((d) => (
                            <option key={d.ip} value={d.ip}>
                              {d.name} ({d.ip})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty search state */}
          {filteredCatalog.length === 0 && filteredCustomRules.length === 0 && (
            <div className="p-8 rounded-3xl bg-white dark:bg-[#232733] border border-black/[0.06] dark:border-white/[0.08] text-center space-y-3">
              <Search className="w-8 h-8 text-neutral-400 mx-auto" />
              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                No services found matching "{searchQuery}"
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                Need to route a service not listed here? Click "+ Custom Domain Rule" to route any domain bundle.
              </p>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Domain</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom Domain Rule Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#232733] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Add Custom App / Domain Rule
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Route specific domains through any WireGuard relay
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustom} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Work VPN, Japanese Anime, Steam CDN"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Domains to Route (one per line or space-separated)
                </label>
                <textarea
                  value={customDomains}
                  onChange={(e) => setCustomDomains(e.target.value)}
                  rows={3}
                  placeholder="example.com&#10;api.example.com&#10;cdn.example.net"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Route Through Relay
                </label>
                <select
                  value={customTunnel}
                  onChange={(e) => setCustomTunnel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                >
                  <option value="direct">Direct WAN (Local ISP)</option>
                  {tunnels.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.id.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Target Device
                </label>
                <select
                  value={customTargetDevice}
                  onChange={(e) => setCustomTargetDevice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                >
                  <option value="all">All Devices (Entire Network)</option>
                  {devices.map((d) => (
                    <option key={d.ip} value={d.ip}>
                      {d.name} ({d.ip})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustom}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer flex items-center gap-1.5"
                >
                  {savingCustom && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
