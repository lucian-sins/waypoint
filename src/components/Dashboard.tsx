import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertCircle,
  Laptop,
  Route,
  Layers,
  Shield,
  Globe,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import type { Device, Tunnel, RouterStatus, AppSettings, AddTunnelPayload, AppRouteRule } from '../lib/types';
import { buildTunnelOptions } from '../lib/locations';
import { Header } from './Header';
import { DeviceList } from './DeviceList';
import { AppRoutingSection } from './AppRoutingSection';
import { TunnelOverview } from './TunnelOverview';
import { DiagnosticsSheet } from './DiagnosticsSheet';
import { Snackbar, type ToastMessage } from './Snackbar';
import { AddTunnelModal } from './AddTunnelModal';
import { SettingsModal } from './SettingsModal';
import { EgressInspectorModal } from './EgressInspectorModal';
import { CopyButton } from './CopyButton';
import { FlagIcon } from './FlagIcon';
import { ServiceIcon } from './ServiceIcon';
import { APP_PRESETS } from '../lib/appPresets';
import { getStoredFavorites, saveStoredFavorites, fetchServerFavorites } from '../lib/favorites';

interface DashboardProps {
  initialStatus: RouterStatus | null;
  initialDevices: Device[];
  initialTunnels: Tunnel[];
  initialAppRules?: AppRouteRule[];
  routerMode: string;
}

const defaultAppSettings: AppSettings = {
  subnets: ['192.168.1.0/24'],
  router: {
    mode: 'live',
    host: 'localhost',
    sshKeyPath: '',
    strictKillswitch: true,
    pollingIntervalSeconds: 10,
  },
  ui: {
    hapticsEnabled: true,
  },
};

export const Dashboard: React.FC<DashboardProps> = ({
  initialStatus,
  initialDevices,
  initialTunnels,
  initialAppRules = [],
  routerMode,
}) => {
  const [status, setStatus] = useState<RouterStatus | null>(initialStatus);
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [tunnels, setTunnels] = useState<Tunnel[]>(initialTunnels);
  const [appRules, setAppRules] = useState<AppRouteRule[]>(initialAppRules);
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [loading, setLoading] = useState(false);
  const [mutatingIps, setMutatingIps] = useState<Set<string>>(new Set());
  const [errorIps, setErrorIps] = useState<Set<string>>(new Set());
  const [mutatingTunnelId, setMutatingTunnelId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'conf' | 'manual'>('conf');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'subnets' | 'relays' | 'router' | 'security'>('subnets');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [currentMode, setCurrentMode] = useState<'live'>('live');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<'overview' | 'devices' | 'apps'>('overview');
  const [isEgressModalOpen, setIsEgressModalOpen] = useState(false);
  const [isTogglingStrict, setIsTogglingStrict] = useState(false);

  // Hydrate view from URL hash on mount & handle browser back/forward buttons
  useEffect(() => {
    const applyHash = () => {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.replace('#', '');
        if (hash === 'devices' || hash === 'apps') {
          setActiveView(hash);
        } else {
          setActiveView('overview');
        }
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  const handleSetView = (view: 'overview' | 'devices' | 'apps') => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      if (view === 'overview') {
        if (window.location.hash) {
          history.pushState(null, '', window.location.pathname);
        }
      } else {
        window.location.hash = view;
      }
    }
  };

  // Hydrate favorites from localStorage and sync from server
  useEffect(() => {
    setFavorites(getStoredFavorites());
    fetchServerFavorites().then((serverFavs) => {
      if (serverFavs && serverFavs.size > 0) {
        setFavorites((prev) => new Set([...prev, ...serverFavs]));
      }
    });
  }, []);

  const handleToggleFavorite = useCallback((id: string) => {
    const cleanId = id.toLowerCase().trim();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(cleanId)) {
        next.delete(cleanId);
      } else {
        next.add(cleanId);
      }
      saveStoredFavorites(next);
      return next;
    });
  }, []);

  // Compute enriched devices with favorite status
  const enrichedDevices = useMemo(() => {
    return devices.map((d) => {
      const idMac = d.mac && d.mac !== '00:00:00:00:00:00' ? d.mac.toLowerCase().trim() : null;
      const isFav = (idMac && favorites.has(idMac)) || favorites.has(d.ip.trim());
      return { ...d, isFavorite: isFav };
    });
  }, [devices, favorites]);

  // Dynamically compute tunnel options for device pill selectors
  const tunnelOptions = useMemo(() => buildTunnelOptions(tunnels), [tunnels]);

  // Overview metrics
  const vpnDevicesCount = useMemo(
    () => enrichedDevices.filter((d) => d.tunnel && d.tunnel !== 'direct').length,
    [enrichedDevices]
  );
  const directDevicesCount = useMemo(
    () => enrichedDevices.filter((d) => !d.tunnel || d.tunnel === 'direct').length,
    [enrichedDevices]
  );
  const activeAppRulesCount = useMemo(
    () => appRules.filter((r) => r.enabled && r.tunnel !== 'direct' && r.tunnel !== 'wan').length,
    [appRules]
  );

  const activeDeviceTunnels = useMemo(() => {
    const set = new Set<string>();
    enrichedDevices.forEach((d) => {
      if (d.tunnel && d.tunnel !== 'direct') set.add(d.tunnel);
    });
    return Array.from(set).map((tid) => {
      const opt = tunnelOptions.find((o) => o.id === tid);
      return {
        id: tid,
        label: opt ? opt.shortLabel : tid.toUpperCase(),
        flag: opt ? opt.flag : '🛡️',
        country_code: opt?.country_code,
      };
    });
  }, [enrichedDevices, tunnelOptions]);

  const handleOpenSettings = (tab: 'subnets' | 'relays' | 'router' | 'security' = 'subnets') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const handleOpenAddModal = (mode: 'conf' | 'manual' = 'conf') => {
    setAddModalTab(mode);
    setIsAddModalOpen(true);
  };

  // Synchronize theme on mount
  useEffect(() => {
    try {
      const isHtmlDark = document.documentElement.classList.contains('dark');
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const activeDark = savedTheme ? savedTheme === 'dark' : isHtmlDark || prefersDark;

      setIsDark(activeDark);
      if (activeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    try {
      localStorage.setItem('theme', nextDark ? 'dark' : 'light');
      if (nextDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      const themeMeta = document.getElementById('theme-color-meta');
      if (themeMeta) {
        themeMeta.setAttribute('content', nextDark ? '#191b22' : '#f8f9fa');
      }
    } catch (e) {}
  };

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    if (toast.type !== 'error') {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch initial settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((s) => {
        if (s) {
          setSettings(s);
          if (s.router?.mode) {
            setCurrentMode(s.router.mode);
          }
        }
      })
      .catch((err) => console.warn('Could not load settings:', err));
  }, []);

  // Fetch full live network telemetry (silent for background polling; loading spinner for manual refresh)
  const refreshData = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setLoading(true);
      }
      try {
        const isClean = typeof window !== 'undefined' && window.location.search.includes('clean=1');
        const telemetryUrl = isClean ? '/api/telemetry?clean=1' : '/api/telemetry';
        const res = await fetch(telemetryUrl);
        if (res.ok) {
          const telemetry = await res.json();
          if (telemetry.status) {
            setStatus(telemetry.status);
            setLastError(null);
          }

          if (telemetry.devices) {
            const freshDevices: Device[] = telemetry.devices;
            // Guard optimistic state: do not overwrite devices actively mutating
            setDevices((prev) =>
              freshDevices.map((fresh) => {
                if (mutatingIps.has(fresh.ip)) {
                  const current = prev.find((p) => p.ip === fresh.ip);
                  return current ? { ...fresh, tunnel: current.tunnel } : fresh;
                }
                return fresh;
              })
            );
          }

          if (telemetry.tunnels) {
            setTunnels(telemetry.tunnels);
          }

          if (telemetry.apps) {
            setAppRules(telemetry.apps);
          }
        } else {
          // Fallback to individual endpoints if telemetry error
          const [resStatus, resDevices, resTunnels, resApps] = await Promise.all([
            fetch('/api/status'),
            fetch('/api/devices'),
            fetch('/api/tunnels'),
            fetch('/api/apps'),
          ]);

          if (resStatus.ok) {
            const s = await resStatus.json();
            setStatus(s);
            setLastError(null);
          } else {
            const errJson = await resStatus.json().catch(() => null);
            setStatus(null);
            if (errJson?.error || errJson?.verbatim) {
              setLastError(errJson.verbatim || errJson.error);
            }
          }

          if (resDevices.ok) {
            const freshDevices: Device[] = await resDevices.json();
            setDevices((prev) =>
              freshDevices.map((fresh) => {
                if (mutatingIps.has(fresh.ip)) {
                  const current = prev.find((p) => p.ip === fresh.ip);
                  return current ? { ...fresh, tunnel: current.tunnel } : fresh;
                }
                return fresh;
              })
            );
          }

          if (resTunnels.ok) {
            const t = await resTunnels.json();
            setTunnels(t);
          }

          if (resApps.ok) {
            const a = await resApps.json();
            setAppRules(a);
          }
        }
      } catch (err: any) {
        console.error('Failed to refresh data', err);
        setLastError(err.message);
      } finally {
        if (isManual) {
          setLoading(false);
        }
      }
    },
    [mutatingIps]
  );

  // Toggle Router PBR Strict Kill Switch Mode
  const handleToggleStrictPbr = async () => {
    if (isTogglingStrict) return;
    const currentStrict = status?.pbr?.strict ?? true;
    const nextStrict = !currentStrict;
    setIsTogglingStrict(true);

    // Optimistic status update
    setStatus((prev) => (prev ? { ...prev, pbr: { ...prev.pbr, strict: nextStrict } } : prev));

    try {
      const res = await fetch('/api/pbr/strict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strict: nextStrict }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle kill switch');
      }

      if (data.status) {
        setStatus(data.status);
      }

      addToast({
        type: nextStrict ? 'success' : 'info',
        title: nextStrict ? 'Strict Kill Switch Active' : 'Strict Kill Switch Disabled',
        message: nextStrict
          ? 'Traffic is dropped immediately if a WireGuard tunnel goes down (no WAN leak).'
          : 'Strict mode off. Traffic will fail over to direct WAN if a tunnel goes down.',
      });
    } catch (err: any) {
      // Revert optimistic update
      setStatus((prev) => (prev ? { ...prev, pbr: { ...prev.pbr, strict: currentStrict } } : prev));
      addToast({
        type: 'error',
        title: 'Kill Switch Error',
        message: err.message,
      });
    } finally {
      setIsTogglingStrict(false);
    }
  };

  // Initial telemetry load on mount
  useEffect(() => {
    refreshData(true);
  }, [refreshData]);

  // Periodic polling using user-configured interval (only when active tab)
  useEffect(() => {
    const intervalMs = (settings.router.pollingIntervalSeconds || 15) * 1000;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && mutatingIps.size === 0) {
        refreshData(false);
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [refreshData, mutatingIps.size, settings.router.pollingIntervalSeconds]);

  // Optimistic Device Tunnel Mutation with Rollback
  const handleTunnelChange = async (ip: string, targetTunnel: string) => {
    const targetDevice = devices.find((d) => d.ip === ip);
    if (!targetDevice) return;

    const previousTunnel = targetDevice.tunnel;
    const targetOption = tunnelOptions.find((o) => o.id === targetTunnel);
    const targetLabel = targetOption ? `${targetOption.flag} ${targetOption.label}` : targetTunnel;

    // 1. Optimistic Update (instant UI feedback)
    setDevices((prev) =>
      prev.map((d) => (d.ip === ip ? { ...d, tunnel: targetTunnel } : d))
    );
    setMutatingIps((prev) => new Set(prev).add(ip));

    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(ip)}/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tunnel: targetTunnel }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to switch tunnel policy');
      }

      // Success: Apply fresh server record safely
      setDevices((prev) =>
        prev.map((d) =>
          d.ip === ip
            ? { ...d, ...(typeof data === 'object' && data !== null ? data : {}), tunnel: data?.tunnel || targetTunnel }
            : d
        )
      );

      addToast({
        type: 'success',
        message: `${targetDevice.name} routed via ${targetLabel}`,
      });

      // Also refresh tunnels to update device-counter tags
      const resTunnels = await fetch('/api/tunnels');
      if (resTunnels.ok) {
        setTunnels(await resTunnels.json());
      }
    } catch (err: any) {
      console.error(`Tunnel assign failed for ${ip}:`, err);

      // Rollback to previous state
      setDevices((prev) =>
        prev.map((d) => (d.ip === ip ? { ...d, tunnel: previousTunnel } : d))
      );

      // Shake animation trigger
      setErrorIps((prev) => new Set(prev).add(ip));
      setTimeout(() => {
        setErrorIps((prev) => {
          const next = new Set(prev);
          next.delete(ip);
          return next;
        });
      }, 1000);

      setLastError(err.message);

      addToast({
        type: 'error',
        title: `Failed to Route ${targetDevice.name}`,
        message: `Could not assign routing destination to ${targetLabel}.`,
        verbatim: err.message,
        onRetry: () => handleTunnelChange(ip, targetTunnel),
      });
    } finally {
      setMutatingIps((prev) => {
        const next = new Set(prev);
        next.delete(ip);
        return next;
      });
    }
  };

  // Toggle Tunnel Interface Up / Down
  const handleToggleTunnel = async (id: string, up: boolean) => {
    setMutatingTunnelId(id);
    try {
      const res = await fetch(`/api/tunnels/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ up }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle tunnel');

      setTunnels((prev) => prev.map((t) => (t.id === id ? data : t)));
      addToast({
        type: 'success',
        message: `Tunnel ${id.toUpperCase()} is now ${up ? 'UP' : 'DOWN'}`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: `Failed to Toggle Tunnel ${id.toUpperCase()}`,
        message: `Could not change WireGuard state to ${up ? 'UP' : 'DOWN'}.`,
        verbatim: err.message,
      });
    } finally {
      setMutatingTunnelId(null);
    }
  };

  // Add a new WireGuard location
  const handleAddTunnel = async (newTunnel: AddTunnelPayload) => {
    const res = await fetch('/api/tunnels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTunnel),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to add location');
    }

    setTunnels((prev) => [...prev.filter((t) => t.id !== data.id), data]);
    addToast({
      type: 'success',
      message: `Location "${newTunnel.label}" deployed and ready for device routing!`,
    });
  };

  // Delete a WireGuard location
  const handleDeleteTunnel = async (id: string) => {
    const res = await fetch(`/api/tunnels/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete location');
    }

    setTunnels((prev) => prev.filter((t) => t.id !== id));
    // Also refresh devices in case any were rerouted back to direct
    const resDevices = await fetch('/api/devices');
    if (resDevices.ok) {
      setDevices(await resDevices.json());
    }

    addToast({
      type: 'info',
      message: `Tunnel location ${id.toUpperCase()} removed`,
    });
  };

  // Save Global Settings
  const handleSaveSettings = async (newSettings: AppSettings) => {
    // If strict killswitch was modified in settings, sync to router PBR engine
    if (
      newSettings.router?.strictKillswitch !== undefined &&
      status?.pbr &&
      newSettings.router.strictKillswitch !== status.pbr.strict
    ) {
      await fetch('/api/pbr/strict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strict: newSettings.router.strictKillswitch }),
      }).catch(console.error);
    }

    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save settings');
    }

    setSettings(data);
    if (data.router?.mode) {
      setCurrentMode(data.router.mode);
    }
    // Re-fetch telemetry with new router mode / settings
    refreshData();
    addToast({
      type: 'success',
      message: 'Settings updated successfully',
    });
  };

  // Refresh live ping latencies for all endpoints
  const handleRefreshLatencies = async () => {
    try {
      const res = await fetch('/api/tunnels/ping', { method: 'POST' });
      if (res.ok) {
        const freshTunnels = await res.json();
        setTunnels(freshTunnels);
        addToast({
          type: 'info',
          message: 'Refreshed live latency telemetry for all locations',
        });
      }
    } catch (err) {
      console.warn('Failed to refresh latencies:', err);
    }
  };

  // Rename device, custom icon & category tag
  const handleRenameDevice = async (
    ip: string,
    name: string,
    icon?: Device['icon'],
    category?: string
  ) => {
    // 1. Optimistic update
    setDevices((prev) =>
      prev.map((d) => (d.ip === ip ? { ...d, name, icon: icon || d.icon, category } : d))
    );

    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(ip)}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon, category }),
      });

      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.error || 'Failed to rename device');
      }

      setDevices((prev) => prev.map((d) => (d.ip === ip ? updated : d)));
      addToast({
        type: 'success',
        message: `Device renamed to "${name}"`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Rename Device',
        message: `Could not save custom name for ${ip}.`,
        verbatim: err.message,
      });
      // Revert from server
      const res = await fetch('/api/devices');
      if (res.ok) setDevices(await res.json());
    }
  };

  // Discover devices by scanning enabled subnets / ARP table
  const handleDiscoverDevices = async () => {
    if (isDiscovering) return;
    setIsDiscovering(true);
    try {
      const res = await fetch('/api/devices/discover', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan network');
      }

      setDevices(data.devices);
      if (data.newCount > 0) {
        addToast({
          type: 'success',
          message: `Network scan complete: Discovered ${data.newCount} new ${
            data.newCount === 1 ? 'device' : 'devices'
          }!`,
        });
      } else {
        addToast({
          type: 'info',
          message: `Network scan complete: All ${data.devices.length} devices are up to date.`,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Subnet Discovery Failed',
        message: 'Could not complete ARP/DHCP scan on the router.',
        verbatim: err.message,
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  // Save App-level Routing Rule
  const handleSaveAppRule = async (rule: {
    id: string;
    name: string;
    serviceKey?: string;
    tunnel: string;
    targetDevice?: string;
    domains: string[];
  }) => {
    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save app routing rule');
      }

      setAppRules((prev) => {
        const filtered = prev.filter((r) => r.id !== data.id);
        return [...filtered, data];
      });

      addToast({
        type: 'success',
        message: `App rule "${data.name}" configured via ${data.tunnel.toUpperCase()}`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Save App Routing Rule',
        message: err.message,
        verbatim: err.message,
      });
      throw err;
    }
  };

  // Toggle App-level Routing Rule (enable / pause)
  const handleToggleAppRule = async (id: string, enabled: boolean) => {
    // Optimistic update
    setAppRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled } : r))
    );

    try {
      const res = await fetch(`/api/apps/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle app rule');
      }

      addToast({
        type: 'info',
        message: `App rule ${enabled ? 'activated' : 'paused'}`,
      });
    } catch (err: any) {
      // Revert optimistic update
      setAppRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: !enabled } : r))
      );

      addToast({
        type: 'error',
        title: 'Failed to Toggle App Rule',
        message: err.message,
        verbatim: err.message,
      });
    }
  };

  // Delete App-level Routing Rule
  const handleDeleteAppRule = async (id: string) => {
    try {
      const res = await fetch(`/api/apps/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete app rule');
      }

      setAppRules((prev) => prev.filter((r) => r.id !== id));
      addToast({
        type: 'info',
        message: 'App routing rule removed',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Delete App Rule',
        message: err.message,
        verbatim: err.message,
      });
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#191b22] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-200">
      <Header
        status={status}
        loading={loading}
        onRefresh={() => refreshData(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenSettings={handleOpenSettings}
        onGoHome={() => handleSetView('overview')}
        routerMode={currentMode}
        onToggleStrictPbr={handleToggleStrictPbr}
        onOpenEgressInspector={() => setIsEgressModalOpen(true)}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8 safe-bottom">
        {/* Router Diagnostic Notice */}
        {lastError && (
          <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-neutral-900 dark:text-neutral-100">
            <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Router Diagnostic Notice
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 break-all">
                    {lastError}
                  </p>
                  <CopyButton
                    text={lastError}
                    label="Copy Error"
                    copiedLabel="Copied!"
                    size="xs"
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border-amber-500/40"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => refreshData(true)}
                className="px-3.5 py-2 rounded-2xl text-xs font-semibold bg-neutral-200/70 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={() => handleOpenSettings('router')}
                className="px-4 py-2 rounded-2xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                View Diagnostics & Logs
              </button>
            </div>
          </div>
        )}

        {/* View: Overview (Minimalistic Hub with 2 Primary Routing Doors) */}
        {activeView === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* The 2 Minimalistic Primary Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Option 1: Device Routing */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleSetView('devices')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSetView('devices');
                  }
                }}
                className="group relative rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#232733] border border-black/[0.06] dark:border-white/[0.08] hover:border-blue-500/40 dark:hover:border-blue-500/40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 touch-press select-none"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Laptop className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 tabular-nums">
                      {enrichedDevices.length} Connected
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Device Routing
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                    Direct client traffic from phones, laptops, and smart TVs through specific WireGuard locations or direct WAN.
                  </p>

                  <div className="mt-5 pt-5 border-t border-black/[0.05] dark:border-white/[0.06] space-y-3">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {enrichedDevices.length} Total Devices
                      </span>
                      <span>·</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {vpnDevicesCount} on VPN
                      </span>
                      <span>·</span>
                      <span className="text-neutral-500">
                        {directDevicesCount} Direct WAN
                      </span>
                    </div>

                    {activeDeviceTunnels.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        {activeDeviceTunnels.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shadow-2xs"
                          >
                            <FlagIcon tunnelId={t.id} countryCode={t.country_code} flag={t.flag} size="sm" />
                            <span>{t.label}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-6 border-t border-black/[0.05] dark:border-white/[0.06]">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span>Manage Devices</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-xs text-neutral-400 font-medium">Open list</span>
                </div>
              </div>

              {/* Option 2: App & Streaming Routing */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleSetView('apps')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSetView('apps');
                  }
                }}
                className="group relative rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#232733] border border-black/[0.06] dark:border-white/[0.08] hover:border-blue-500/40 dark:hover:border-blue-500/40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 touch-press select-none"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Route className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 tabular-nums">
                      {activeAppRulesCount} Active {activeAppRulesCount === 1 ? 'Rule' : 'Rules'}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    App & Streaming Routing
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                    Selective split tunneling for Apple TV+, Netflix, Disney+, Hulu, Prime Video, and 20+ services.
                  </p>

                  <div className="mt-5 pt-5 border-t border-black/[0.05] dark:border-white/[0.06] space-y-3">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {appRules.length} Configured
                      </span>
                      <span>·</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {APP_PRESETS.length} Services Ready
                      </span>
                    </div>

                    {/* Brand icons preview bar */}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      {APP_PRESETS.slice(0, 5).map((preset) => {
                        const isRuleActive = appRules.some(
                          (r) =>
                            (r.serviceKey === preset.id ||
                              r.id === preset.id ||
                              r.name.toLowerCase() === preset.name.toLowerCase() ||
                              r.domains.some((d) => preset.domains.includes(d))) &&
                            r.enabled &&
                            r.tunnel !== 'direct' &&
                            r.tunnel !== 'wan'
                        );
                        return (
                          <span
                            key={preset.id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors shadow-2xs ${
                              isRuleActive
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-bold'
                                : 'bg-neutral-100/80 dark:bg-neutral-800/60 border-black/[0.04] dark:border-white/[0.05] text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            <ServiceIcon serviceKey={preset.id} name={preset.name} size="xs" />
                            <span className="text-[11px]">{preset.name}</span>
                            {isRuleActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                            )}
                          </span>
                        );
                      })}
                      <span className="text-[11px] text-neutral-400 font-medium px-1">
                        +{APP_PRESETS.length - 5} more
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-6 border-t border-black/[0.05] dark:border-white/[0.06]">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span>Configure App Rules</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-xs text-neutral-400 font-medium">Open list</span>
                </div>
              </div>
            </div>

            {/* Quick Security & Route Verification Strip */}
            <div className="p-4 rounded-3xl bg-white dark:bg-[#232733] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    status?.pbr.strict
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <span>Strict Kill Switch: {status?.pbr.strict ? 'Active' : 'Off'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                      {status?.pbr.strict ? 'Zero Leaks' : 'Failover to WAN'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {status?.pbr.strict
                      ? 'Traffic cuts immediately if a WireGuard tunnel goes down.'
                      : 'VPN disconnects will automatically route devices via direct WAN.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleToggleStrictPbr}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    status?.pbr.strict
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-400/80 hover:bg-emerald-100'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-400/80 hover:bg-amber-100'
                  }`}
                >
                  {status?.pbr.strict ? 'Kill Switch: ON' : 'Turn ON'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsEgressModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-black/[0.06] dark:border-white/[0.08] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span>Verify Route</span>
                </button>
              </div>
            </div>

            {/* WireGuard Relays & Locations (Collapsible Overview) */}
            <TunnelOverview
              tunnels={tunnels}
              devices={enrichedDevices}
              onToggleTunnel={handleToggleTunnel}
              mutatingTunnelId={mutatingTunnelId}
              onOpenAddModal={handleOpenAddModal}
              onRefreshLatencies={handleRefreshLatencies}
            />

            {/* Diagnostics & Health */}
            <DiagnosticsSheet
              status={status}
              lastError={lastError}
              onToggleStrictPbr={handleToggleStrictPbr}
              onOpenEgressInspector={() => setIsEgressModalOpen(true)}
            />
          </div>
        )}

        {/* View: Dedicated Connected Devices List */}
        {activeView === 'devices' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* View Navigation Bar */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => handleSetView('overview')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white bg-white dark:bg-[#232733] hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-black/[0.06] dark:border-white/[0.08] shadow-xs transition-all cursor-pointer touch-press"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <div className="flex items-center bg-neutral-200/70 dark:bg-neutral-800/80 p-1 rounded-2xl border border-black/[0.04] dark:border-white/[0.05]">
                <button
                  type="button"
                  onClick={() => handleSetView('devices')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs cursor-pointer"
                >
                  <Laptop className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Devices</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 font-bold tabular-nums">
                    {enrichedDevices.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetView('apps')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Route className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>App & Streaming</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 font-bold tabular-nums">
                    {activeAppRulesCount}
                  </span>
                </button>
              </div>
            </div>

            <DeviceList
              devices={enrichedDevices}
              tunnelOptions={tunnelOptions}
              onTunnelChange={handleTunnelChange}
              onRenameDevice={handleRenameDevice}
              onToggleFavorite={handleToggleFavorite}
              onDiscoverDevices={handleDiscoverDevices}
              isDiscovering={isDiscovering}
              mutatingIps={mutatingIps}
              errorIps={errorIps}
              loading={loading}
            />
          </div>
        )}

        {/* View: Dedicated App & Streaming Routing List */}
        {activeView === 'apps' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* View Navigation Bar */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => handleSetView('overview')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white bg-white dark:bg-[#232733] hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-black/[0.06] dark:border-white/[0.08] shadow-xs transition-all cursor-pointer touch-press"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <div className="flex items-center bg-neutral-200/70 dark:bg-neutral-800/80 p-1 rounded-2xl border border-black/[0.04] dark:border-white/[0.05]">
                <button
                  type="button"
                  onClick={() => handleSetView('devices')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Devices</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 font-bold tabular-nums">
                    {enrichedDevices.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetView('apps')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs cursor-pointer"
                >
                  <Route className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>App & Streaming</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 font-bold tabular-nums">
                    {activeAppRulesCount}
                  </span>
                </button>
              </div>
            </div>

            <AppRoutingSection
              appRules={appRules}
              tunnels={tunnels}
              devices={enrichedDevices}
              onSaveRule={handleSaveAppRule}
              onToggleRule={handleToggleAppRule}
              onDeleteRule={handleDeleteAppRule}
            />
          </div>
        )}
      </main>

      {/* Add Tunnel Location Modal */}
      <AddTunnelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTunnel={handleAddTunnel}
        initialTab={addModalTab}
      />

      {/* Global Settings & Configuration Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
        settings={settings}
        tunnels={tunnels}
        devices={devices}
        onSaveSettings={handleSaveSettings}
        onAddTunnel={handleAddTunnel}
        onDeleteTunnel={handleDeleteTunnel}
      />

      {/* Client Egress & Route Inspector Modal */}
      <EgressInspectorModal
        isOpen={isEgressModalOpen}
        onClose={() => setIsEgressModalOpen(false)}
        status={status}
        tunnels={tunnels}
        onToggleKillSwitch={handleToggleStrictPbr}
      />

      {/* Floating Material Toast / Snackbar */}
      <Snackbar toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
