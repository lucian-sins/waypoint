import React, { useState, useMemo } from 'react';
import {
  Search,
  Smartphone,
  Laptop,
  Tv,
  Tablet,
  Cpu,
  Radar,
  Tag,
  Star,
  Globe,
  Shield,
  Layers,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import type { Device, TunnelOption } from '../lib/types';
import { DeviceCard } from './DeviceCard';
import { isUnnamedDevice } from '../lib/macVendor';
import { FlagIcon } from './FlagIcon';
import { formatBytes } from '../lib/formatters';

export type GroupByMode = 'location' | 'type' | 'status' | 'tag' | 'none';

interface DeviceSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  devices: Device[];
  summary?: string;
}

interface DeviceListProps {
  devices: Device[];
  tunnelOptions: TunnelOption[];
  onTunnelChange: (ip: string, tunnel: string) => Promise<void>;
  onRenameDevice: (ip: string, name: string, icon?: Device['icon'], category?: string) => Promise<void>;
  onToggleFavorite?: (id: string) => void;
  onDiscoverDevices?: () => Promise<void>;
  isDiscovering?: boolean;
  mutatingIps: Set<string>;
  errorIps: Set<string>;
  loading: boolean;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  tunnelOptions,
  onTunnelChange,
  onRenameDevice,
  onToggleFavorite,
  onDiscoverDevices,
  isDiscovering = false,
  mutatingIps,
  errorIps,
  loading,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'tunnelled' | 'direct' | 'unnamed'>('all');

  // Grouping mode state (persisted)
  const [groupBy, setGroupBy] = useState<GroupByMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('waypoint_device_groupby') as GroupByMode;
      if (['location', 'type', 'status', 'tag', 'none'].includes(saved)) {
        return saved;
      }
    }
    return 'location';
  });

  const handleGroupByChange = (mode: GroupByMode) => {
    setGroupBy(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('waypoint_device_groupby', mode);
    }
  };

  // Collapsed state for each section
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('waypoint_device_sections_collapsed');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('waypoint_device_sections_collapsed', JSON.stringify(next));
      }
      return next;
    });
  };

  const unnamedCount = useMemo(() => {
    return devices.filter(isUnnamedDevice).length;
  }, [devices]);

  const favoritesCount = useMemo(() => {
    return devices.filter((d) => d.isFavorite).length;
  }, [devices]);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matching = devices.filter((d) => {
      const matchesSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.ip.includes(q) ||
        d.mac.toLowerCase().includes(q) ||
        (d.vendor && d.vendor.toLowerCase().includes(q)) ||
        (d.category && d.category.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filter === 'favorites') return !!d.isFavorite;
      if (filter === 'tunnelled') return d.tunnel !== 'direct';
      if (filter === 'direct') return d.tunnel === 'direct';
      if (filter === 'unnamed') return isUnnamedDevice(d);
      return true;
    });

    // When viewing "all" or "favorites", prioritize favorited devices at the top
    return matching.sort((a, b) => {
      if (filter === 'all' && groupBy === 'none') {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
      }
      return 0;
    });
  }, [devices, search, filter, groupBy]);

  // Compute sections based on active grouping mode
  const sections = useMemo<DeviceSection[]>(() => {
    if (groupBy === 'none') {
      return [
        {
          id: 'all',
          title: 'All Devices',
          icon: <Smartphone className="w-4 h-4 text-neutral-500" />,
          devices: filteredDevices,
        },
      ];
    }

    if (groupBy === 'location') {
      const list: DeviceSection[] = [];
      const accounted = new Set<string>();

      for (const opt of tunnelOptions) {
        const matching = filteredDevices.filter((d) => d.tunnel === opt.id);
        if (matching.length > 0) {
          matching.forEach((d) => accounted.add(d.ip));
          const totalRx = matching.reduce((acc, d) => acc + (d.rx_bytes || 0), 0);
          const totalTx = matching.reduce((acc, d) => acc + (d.tx_bytes || 0), 0);
          const hasTraffic = totalRx > 0 || totalTx > 0;

          list.push({
            id: `loc_${opt.id}`,
            title: opt.label,
            icon: (
              <FlagIcon
                tunnelId={opt.id}
                countryCode={opt.country_code}
                label={opt.label}
                flag={opt.flag}
                size="sm"
              />
            ),
            devices: matching,
            summary: hasTraffic ? `↓ ${formatBytes(totalRx)} · ↑ ${formatBytes(totalTx)}` : undefined,
          });
        }
      }

      // Check for any devices with custom/unaccounted tunnels
      const remaining = filteredDevices.filter((d) => !accounted.has(d.ip));
      if (remaining.length > 0) {
        list.push({
          id: 'loc_other',
          title: 'Other Locations',
          icon: <Shield className="w-4 h-4 text-neutral-500" />,
          devices: remaining,
        });
      }

      return list;
    }

    if (groupBy === 'type') {
      const typeConfigs: Array<{
        key: Device['icon'] | 'other';
        title: string;
        icon: React.ReactNode;
        matcher: (d: Device) => boolean;
      }> = [
        {
          key: 'phone',
          title: 'Phones & Mobile',
          icon: <Smartphone className="w-4 h-4 text-blue-500" />,
          matcher: (d) => d.icon === 'phone',
        },
        {
          key: 'laptop',
          title: 'Computers & Laptops',
          icon: <Laptop className="w-4 h-4 text-indigo-500" />,
          matcher: (d) => d.icon === 'laptop',
        },
        {
          key: 'tv',
          title: 'TVs & Entertainment',
          icon: <Tv className="w-4 h-4 text-rose-500" />,
          matcher: (d) => d.icon === 'tv',
        },
        {
          key: 'tablet',
          title: 'Tablets',
          icon: <Tablet className="w-4 h-4 text-emerald-500" />,
          matcher: (d) => d.icon === 'tablet',
        },
        {
          key: 'iot',
          title: 'Smart Home & IoT',
          icon: <Cpu className="w-4 h-4 text-amber-500" />,
          matcher: (d) => d.icon === 'iot',
        },
        {
          key: 'other',
          title: 'Other Devices',
          icon: <Smartphone className="w-4 h-4 text-neutral-400" />,
          matcher: (d) => !d.icon || d.icon === 'device',
        },
      ];

      const list: DeviceSection[] = [];
      for (const cfg of typeConfigs) {
        const matching = filteredDevices.filter(cfg.matcher);
        if (matching.length > 0) {
          list.push({
            id: `type_${cfg.key}`,
            title: cfg.title,
            icon: cfg.icon,
            devices: matching,
          });
        }
      }
      return list;
    }

    if (groupBy === 'status') {
      const favs = filteredDevices.filter((d) => d.isFavorite);
      const vpn = filteredDevices.filter((d) => !d.isFavorite && d.tunnel !== 'direct' && d.online);
      const direct = filteredDevices.filter((d) => !d.isFavorite && d.tunnel === 'direct' && d.online);
      const offline = filteredDevices.filter((d) => !d.online);

      const list: DeviceSection[] = [];
      if (favs.length > 0) {
        list.push({
          id: 'status_favs',
          title: 'Favorites',
          icon: <Star className="w-4 h-4 text-amber-500 fill-amber-400" />,
          devices: favs,
        });
      }
      if (vpn.length > 0) {
        list.push({
          id: 'status_vpn',
          title: 'Encrypted via WireGuard',
          icon: <Shield className="w-4 h-4 text-blue-500" />,
          devices: vpn,
        });
      }
      if (direct.length > 0) {
        list.push({
          id: 'status_direct',
          title: 'Direct WAN (Unencrypted)',
          icon: <Globe className="w-4 h-4 text-neutral-500" />,
          devices: direct,
        });
      }
      if (offline.length > 0) {
        list.push({
          id: 'status_offline',
          title: 'Offline Devices',
          icon: <Smartphone className="w-4 h-4 text-neutral-400" />,
          devices: offline,
        });
      }
      return list;
    }

    if (groupBy === 'tag') {
      const groups: Record<string, Device[]> = {};
      for (const d of filteredDevices) {
        const tag = d.category && d.category.trim() ? d.category.trim() : 'Uncategorized';
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push(d);
      }

      return Object.entries(groups)
        .sort(([a], [b]) => {
          if (a === 'Uncategorized') return 1;
          if (b === 'Uncategorized') return -1;
          return a.localeCompare(b);
        })
        .map(([tag, devs]) => ({
          id: `tag_${tag.toLowerCase().replace(/\s+/g, '_')}`,
          title: tag,
          icon: <Tag className="w-4 h-4 text-blue-500" />,
          devices: devs,
        }));
    }

    return [
      {
        id: 'all',
        title: 'All Devices',
        icon: <Smartphone className="w-4 h-4 text-neutral-500" />,
        devices: filteredDevices,
      },
    ];
  }, [filteredDevices, groupBy, tunnelOptions]);

  const areAllCollapsed = useMemo(() => {
    if (sections.length === 0) return false;
    return sections.every((s) => !!collapsedSections[s.id]);
  }, [sections, collapsedSections]);

  const toggleAllSections = () => {
    const nextVal = !areAllCollapsed;
    const nextState: Record<string, boolean> = {};
    for (const s of sections) {
      nextState[s.id] = nextVal;
    }
    setCollapsedSections(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('waypoint_device_sections_collapsed', JSON.stringify(nextState));
    }
  };

  return (
    <section className="space-y-4">
      {/* Section Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <span>Devices</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {devices.length}
            </span>
            {unnamedCount > 0 && (
              <button
                type="button"
                onClick={() => setFilter(filter === 'unnamed' ? 'all' : 'unnamed')}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors cursor-pointer"
                title={`${unnamedCount} devices have no custom hostname`}
              >
                {unnamedCount} Unnamed
              </button>
            )}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Tap a device's location badge to change its WireGuard routing
          </p>
        </div>

        {/* Actions: Discover + Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {onDiscoverDevices && (
            <button
              onClick={onDiscoverDevices}
              disabled={isDiscovering}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-100/80 transition-colors cursor-pointer touch-press shrink-0 disabled:opacity-50"
              title="Scan enabled subnets for active ARP clients and new DHCP leases"
            >
              <Radar className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isDiscovering ? 'Scanning...' : 'Discover'}</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-blue-600 text-white dark:bg-blue-500 shadow-xs font-semibold'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
              }`}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => setFilter('favorites')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                filter === 'favorites'
                  ? 'bg-amber-500 text-white shadow-xs font-semibold'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  filter === 'favorites' ? 'fill-white text-white' : 'text-amber-500 fill-amber-400/40'
                }`}
              />
              <span>Favorites</span>
              {favoritesCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    filter === 'favorites'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {favoritesCount}
                </span>
              )}
            </button>

            {(['tunnelled', 'direct'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all cursor-pointer ${
                  filter === key
                    ? 'bg-blue-600 text-white dark:bg-blue-500 shadow-xs font-semibold'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
                }`}
              >
                {key}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setFilter('unnamed')}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all cursor-pointer inline-flex items-center gap-1 ${
                filter === 'unnamed'
                  ? 'bg-amber-600 text-white dark:bg-amber-500 shadow-xs font-semibold'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
              }`}
            >
              <span>Unnamed</span>
              {unnamedCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filter === 'unnamed'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                }`}>
                  {unnamedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name, IP, MAC, room tag, or vendor..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#232733] border border-black/[0.06] dark:border-white/[0.08] text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 px-1.5 py-0.5 rounded cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category / Grouping Selector Toolbar */}
      {devices.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 flex items-center gap-1 px-1">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Categorize:</span>
            </span>

            <div className="inline-flex items-center p-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800/90 border border-black/[0.04] dark:border-white/[0.05]">
              {(
                [
                  { id: 'location', label: 'By Location' },
                  { id: 'type', label: 'By Type' },
                  { id: 'status', label: 'By Status' },
                  { id: 'tag', label: 'By Tag' },
                  { id: 'none', label: 'Flat List' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleGroupByChange(mode.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    groupBy === mode.id
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Collapse All / Expand All button when grouped */}
          {groupBy !== 'none' && sections.length > 1 && (
            <button
              type="button"
              onClick={toggleAllSections}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              title={areAllCollapsed ? 'Expand all sections' : 'Collapse all sections'}
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
              <span>{areAllCollapsed ? 'Expand All' : 'Collapse All'}</span>
            </button>
          )}
        </div>
      )}

      {/* Devices List */}
      {devices.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl bg-white dark:bg-[#232733] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
          <Smartphone className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto" />
          <div>
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              No Devices Detected on Router
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              No active DHCP leases or ARP clients found. Scan your subnet now or verify router SSH authorization in Settings.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {onDiscoverDevices && (
              <button
                onClick={onDiscoverDevices}
                disabled={isDiscovering}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Radar className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                <span>{isDiscovering ? 'Scanning Subnet...' : 'Scan / Discover Devices'}</span>
              </button>
            )}
          </div>
        </div>
      ) : filter === 'favorites' && filteredDevices.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl bg-white dark:bg-[#232733] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Star className="w-6 h-6 fill-amber-400/20 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              No Favorite Devices Yet
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              Tap the star (⭐) icon on any device card to pin the phones, TVs, or laptops you use most often.
            </p>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
            >
              Show All Devices
            </button>
          </div>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="text-center py-12 rounded-3xl bg-white dark:bg-[#232733] border border-black/[0.06] dark:border-white/[0.08]">
          <Smartphone className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            No devices found matching "{search}"
          </p>
          <button
            onClick={() => {
              setSearch('');
              setFilter('all');
            }}
            className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : groupBy === 'none' ? (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.ip}
              device={device}
              tunnelOptions={tunnelOptions}
              onTunnelChange={onTunnelChange}
              onRenameDevice={onRenameDevice}
              onToggleFavorite={onToggleFavorite}
              isMutating={mutatingIps.has(device.ip)}
              hasError={errorIps.has(device.ip)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const isCollapsed = !!collapsedSections[section.id];
            return (
              <div key={section.id} className="space-y-3">
                {/* Collapsible Section Header Button */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-white hover:bg-neutral-50 dark:bg-[#232733] dark:hover:bg-[#2b303f] border border-black/[0.06] dark:border-white/[0.08] shadow-2xs hover:shadow-xs transition-all cursor-pointer group select-none"
                  aria-expanded={!isCollapsed}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-sm shrink-0">
                      {section.icon}
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
                        {section.title}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-black/[0.04] dark:border-white/[0.05]">
                        {section.devices.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {section.summary && (
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:inline-block font-mono">
                        {section.summary}
                      </span>
                    )}
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors">
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isCollapsed ? '-rotate-90 text-neutral-400' : 'rotate-0 text-blue-600 dark:text-blue-400'
                        }`}
                      />
                    </div>
                  </div>
                </button>

                {/* Section Device Cards */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 gap-3.5 animate-in fade-in duration-150">
                    {section.devices.map((device) => (
                      <DeviceCard
                        key={device.ip}
                        device={device}
                        tunnelOptions={tunnelOptions}
                        onTunnelChange={onTunnelChange}
                        onRenameDevice={onRenameDevice}
                        onToggleFavorite={onToggleFavorite}
                        isMutating={mutatingIps.has(device.ip)}
                        hasError={errorIps.has(device.ip)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
