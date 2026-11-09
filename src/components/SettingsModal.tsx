import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Network,
  Shield,
  Sliders,
  Plus,
  Trash2,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  HelpCircle,
  Vibrate,
  Key,
  Copy,
  Terminal,
  Lock,
  Eye,
  EyeOff,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import type { AppSettings, Tunnel, Device, AddTunnelPayload, SslStatus } from '../lib/types';
import { isValidCidr } from '../lib/cidr';
import { parseWireguardConf } from '../lib/wireguardParser';
import { getTunnelFlag } from '../lib/locations';
import { CopyButton } from './CopyButton';
import { FlagIcon } from './FlagIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  tunnels: Tunnel[];
  devices: Device[];
  initialTab?: 'subnets' | 'relays' | 'router' | 'security';
  onSaveSettings: (newSettings: AppSettings) => Promise<void>;
  onAddTunnel: (tunnel: AddTunnelPayload) => Promise<void>;
  onDeleteTunnel: (id: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  tunnels,
  devices,
  initialTab,
  onSaveSettings,
  onAddTunnel,
  onDeleteTunnel,
}) => {
  const [activeTab, setActiveTab] = useState<'subnets' | 'relays' | 'router' | 'security'>(initialTab || 'subnets');
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [newCidr, setNewCidr] = useState('');
  const [cidrError, setCidrError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // SSL & Web Server state
  const [sslStatus, setSslStatus] = useState<SslStatus | null>(null);
  const [loadingSsl, setLoadingSsl] = useState(false);
  const [webPort, setWebPort] = useState<number>(settings.server?.port || 8443);
  const [savingPort, setSavingPort] = useState(false);
  const [portMessage, setPortMessage] = useState<string | null>(null);

  // CSR form state
  const [csrCommonName, setCsrCommonName] = useState('router.lan');
  const [csrSans, setCsrSans] = useState('192.168.10.1, router.lan');
  const [csrOrg, setCsrOrg] = useState('WayPoint');
  const [generatingCsr, setGeneratingCsr] = useState(false);
  const [generatedCsr, setGeneratedCsr] = useState<string | null>(null);
  const [copiedCsr, setCopiedCsr] = useState(false);
  const [csrError, setCsrError] = useState<string | null>(null);

  // Certificate Upload state
  const [certPem, setCertPem] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);
  const [certSuccess, setCertSuccess] = useState<string | null>(null);
  const [certError, setCertError] = useState<string | null>(null);
  const [togglingSsl, setTogglingSsl] = useState(false);

  const fetchSslStatus = async () => {
    setLoadingSsl(true);
    try {
      const res = await fetch('/api/ssl');
      if (res.ok) {
        const data: SslStatus = await res.json();
        setSslStatus(data);
        if (data.web_port) setWebPort(data.web_port);
        if (data.csr) setGeneratedCsr(data.csr);
      }
    } catch (e) {
      console.error('Failed to fetch SSL status:', e);
    } finally {
      setLoadingSsl(false);
    }
  };

  const handleGenerateCsr = async () => {
    if (!csrCommonName.trim()) {
      setCsrError('Common Name / Domain is required.');
      return;
    }
    setGeneratingCsr(true);
    setCsrError(null);
    try {
      const res = await fetch('/api/ssl/csr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          common_name: csrCommonName.trim(),
          sans: csrSans.trim(),
          organization: csrOrg.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.csr) {
        setGeneratedCsr(data.csr);
        fetchSslStatus();
      } else {
        setCsrError(data.error || 'Failed to generate CSR.');
      }
    } catch (e: any) {
      setCsrError(e.message || 'Error communicating with router.');
    } finally {
      setGeneratingCsr(false);
    }
  };

  const handleDownloadCsr = () => {
    if (!generatedCsr) return;
    const blob = new Blob([generatedCsr], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${csrCommonName || 'waypoint'}.csr`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInstallCert = async () => {
    if (!certPem.trim()) {
      setCertError('Please paste or upload a valid PEM certificate.');
      return;
    }
    setUploadingCert(true);
    setCertError(null);
    setCertSuccess(null);
    try {
      const res = await fetch('/api/ssl/cert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cert_pem: certPem.trim(),
          port: webPort,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCertSuccess(`Certificate installed successfully! Valid until: ${data.valid_to || 'N/A'}`);
        setCertPem('');
        fetchSslStatus();
        if (window.location.protocol !== 'https:') {
          setTimeout(() => {
            window.location.href = `https://${window.location.hostname}:${webPort}`;
          }, 2000);
        }
      } else {
        setCertError(data.error || 'Failed to install certificate.');
      }
    } catch (e: any) {
      setCertError(e.message || 'Error communicating with router.');
    } finally {
      setUploadingCert(false);
    }
  };

  const handleToggleSsl = async (enable: boolean) => {
    setTogglingSsl(true);
    try {
      const res = await fetch('/api/ssl/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: enable,
          port: webPort,
        }),
      });
      if (res.ok) {
        fetchSslStatus();
        setTimeout(() => {
          const targetProtocol = enable ? 'https:' : 'http:';
          if (window.location.protocol !== targetProtocol) {
            window.location.href = `${targetProtocol}//${window.location.hostname}:${webPort}`;
          }
        }, 1500);
      }
    } catch (e) {
      console.error('Failed to toggle SSL:', e);
    } finally {
      setTogglingSsl(false);
    }
  };

  const handleSavePort = async () => {
    if (webPort < 1 || webPort > 65535) {
      setPortMessage('Port must be between 1 and 65535.');
      return;
    }
    setSavingPort(true);
    setPortMessage(null);
    try {
      const res = await fetch('/api/system/port', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: webPort }),
      });
      const data = await res.json();
      if (res.ok) {
        setPortMessage(`Port changed to ${webPort}. Redirecting to new port...`);
        setTimeout(() => {
          const protocol = sslStatus?.ssl_enabled ? 'https:' : window.location.protocol;
          window.location.href = `${protocol}//${window.location.hostname}:${webPort}`;
        }, 1500);
      } else {
        setPortMessage(data.error || 'Failed to change port.');
      }
    } catch (e: any) {
      setPortMessage(e.message || 'Error changing port.');
    } finally {
      setSavingPort(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'security') {
      fetchSslStatus();
    }
  }, [isOpen, activeTab]);

  // WireGuard .conf import state
  const [importText, setImportText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importParsed, setImportParsed] = useState<ReturnType<typeof parseWireguardConf> | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmDeleteTunnelId, setConfirmDeleteTunnelId] = useState<string | null>(null);
  const [isDeletingTunnel, setIsDeletingTunnel] = useState(false);

  // System Logs & Daemon Telemetry state
  const [logs, setLogs] = useState<{ time: string; level: string; message: string }[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleClearLogs = async () => {
    setClearingLogs(true);
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (e) {
      console.error('Failed to clear logs:', e);
    } finally {
      setClearingLogs(false);
    }
  };

  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    const text = logs.map((l) => `[${l.time}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    });
  };

  useEffect(() => {
    if (isOpen && activeTab === 'router') {
      fetchLogs();
    }
  }, [isOpen, activeTab]);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setFormSettings(settings);
      setNewCidr('');
      setCidrError(null);
      setSaveSuccess(false);
      setImportText('');
      setImportParsed(null);
      setImportError(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // Derive subnets detected from currently connected devices
  const detectedSubnets = Array.from(
    new Set(
      devices
        .map((d) => {
          const parts = d.ip.split('.');
          return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : null;
        })
        .filter(Boolean) as string[]
    )
  );

  const handleAddCidr = () => {
    const clean = newCidr.trim();
    if (!clean) return;
    if (!isValidCidr(clean)) {
      setCidrError('Invalid CIDR format. Examples: 192.168.10.0/24, 10.0.0.0/8');
      return;
    }
    if (formSettings.subnets.includes(clean)) {
      setCidrError('This CIDR is already enabled.');
      return;
    }

    setFormSettings((prev) => ({
      ...prev,
      subnets: [...prev.subnets, clean],
    }));
    setNewCidr('');
    setCidrError(null);
  };

  const handleRemoveCidr = (cidrToRemove: string) => {
    if (formSettings.subnets.length <= 1) {
      setCidrError('At least one subnet CIDR must remain enabled.');
      return;
    }
    setFormSettings((prev) => ({
      ...prev,
      subnets: prev.subnets.filter((c) => c !== cidrToRemove),
    }));
    setCidrError(null);
  };

  const handleConfFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
      try {
        const parsed = parseWireguardConf(content, file.name);
        if (!parsed.endpoint) {
          setImportError('No Endpoint found in config file (expected Endpoint = host:port).');
          setImportParsed(null);
        } else {
          setImportParsed(parsed);
          setImportError(null);
        }
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse configuration');
      }
    };
    reader.readAsText(file);
  };

  const handleConfTextChange = (text: string) => {
    setImportText(text);
    if (!text.trim()) {
      setImportParsed(null);
      setImportError(null);
      return;
    }
    try {
      const parsed = parseWireguardConf(text, importFileName || 'custom.conf');
      if (parsed.endpoint) {
        setImportParsed(parsed);
        setImportError(null);
      } else {
        setImportParsed(null);
      }
    } catch {
      setImportParsed(null);
    }
  };

  const handleSaveImportedRelay = async () => {
    if (!importParsed || !importParsed.endpoint) return;

    setImporting(true);
    setImportError(null);
    try {
      await onAddTunnel({
        id: importParsed.suggestedId,
        label: importParsed.suggestedLabel,
        endpoint: importParsed.endpoint,
        provider: 'wireguard-conf',
        confContent: importParsed.rawText || importText,
        privateKey: importParsed.privateKey,
        address: importParsed.address,
        publicKey: importParsed.publicKey,
        dns: importParsed.dns,
      });
      // Clear import form
      setImportText('');
      setImportParsed(null);
      setImportFileName('');
    } catch (err: any) {
      setImportError(err.message || 'Failed to deploy imported tunnel relay');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await onSaveSettings(formSettings);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/20 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#232733] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Global Settings
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Subnets, WireGuard destinations & router policy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0 bg-neutral-50/50 dark:bg-neutral-900/30 overflow-x-auto">
          <button
            onClick={() => setActiveTab('subnets')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 font-medium text-xs whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'subnets'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Subnets & CIDRs</span>
          </button>
          <button
            onClick={() => setActiveTab('relays')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 font-medium text-xs whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'relays'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>WireGuard Relays ({tunnels.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('router')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 font-medium text-xs whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'router'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Router & Policy</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 font-medium text-xs whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>SSL & Web Server</span>
          </button>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* TAB 1: SUBNETS */}
          {activeTab === 'subnets' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Enabled Network CIDRs
                </h4>
                <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Devices matching these IPv4 CIDR blocks can be assigned to WireGuard policy routing.
                </p>
              </div>

              {/* Active CIDRs List */}
              <div className="space-y-2">
                {formSettings.subnets.map((cidr) => (
                  <div
                    key={cidr}
                    className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {cidr}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCidr(cidr)}
                      title="Remove CIDR"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add CIDR Input */}
              <div className="space-y-2 pt-2">
                <label className="block font-medium text-neutral-700 dark:text-neutral-300">
                  Add New Subnet CIDR
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCidr}
                    onChange={(e) => {
                      setNewCidr(e.target.value);
                      setCidrError(null);
                    }}
                    placeholder="e.g. 192.168.20.0/24 or 10.0.0.0/24"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-black/[0.06] dark:border-white/[0.08] text-neutral-900 dark:text-neutral-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <button
                    type="button"
                    onClick={handleAddCidr}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer touch-press"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Subnet</span>
                  </button>
                </div>
                {cidrError && (
                  <p className="text-red-600 dark:text-red-400 flex items-center gap-1 mt-1 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{cidrError}</span>
                  </p>
                )}
              </div>

              {/* Quick Suggestion from Connected Leases */}
              {detectedSubnets.some((s) => !formSettings.subnets.includes(s)) && (
                <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Detected Subnet from Active Leases:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detectedSubnets
                      .filter((s) => !formSettings.subnets.includes(s))
                      .map((detected) => (
                        <button
                          key={detected}
                          type="button"
                          onClick={() => {
                            setFormSettings((prev) => ({
                              ...prev,
                              subnets: [...prev.subnets, detected],
                            }));
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white dark:bg-neutral-800 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono text-[11px] hover:bg-blue-100/50 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{detected}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RELAYS & .CONF IMPORT */}
          {activeTab === 'relays' && (
            <div className="space-y-6">
              {/* Existing Relays */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                      Configured WireGuard Locations ({tunnels.length})
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      All relay interfaces installed on the router. Toggling off on the dashboard only disables them; to erase completely, use the action below.
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {tunnels.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-neutral-100/60 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5 text-center text-xs text-neutral-500">
                      No WireGuard locations configured. Import a .conf file below.
                    </div>
                  ) : (
                    tunnels.map((tunnel) => (
                      <div
                        key={tunnel.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05]"
                      >
                        <div className="flex items-center gap-3">
                          <FlagIcon
                            tunnelId={tunnel.id}
                            countryCode={tunnel.country_code}
                            label={tunnel.label}
                            flag={tunnel.flag}
                            size="md"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {tunnel.label}
                              </span>
                              <span className="font-mono text-[10px] text-neutral-400 uppercase">
                                {tunnel.id}
                              </span>
                            </div>
                            <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                              {tunnel.endpoint}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              tunnel.state === 'up'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                            }`}
                          >
                            {tunnel.state.toUpperCase()}
                          </span>

                          {confirmDeleteTunnelId === tunnel.id ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-1">
                              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                Erase?
                              </span>
                              <button
                                type="button"
                                disabled={isDeletingTunnel}
                                onClick={async () => {
                                  setIsDeletingTunnel(true);
                                  try {
                                    await onDeleteTunnel(tunnel.id);
                                  } finally {
                                    setIsDeletingTunnel(false);
                                    setConfirmDeleteTunnelId(null);
                                  }
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isDeletingTunnel ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  'Confirm'
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={isDeletingTunnel}
                                onClick={() => setConfirmDeleteTunnelId(null)}
                                className="px-2 py-1 text-[11px] font-medium rounded-lg bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTunnelId(tunnel.id)}
                              title={`Erase ${tunnel.label} permanently`}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Import .conf File */}
              <div className="p-4 rounded-3xl bg-neutral-50 dark:bg-neutral-900/50 border border-black/[0.06] dark:border-white/[0.08] space-y-3.5">
                <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                  <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Import WireGuard Config (.conf)</span>
                </div>
                <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                  Drop a WireGuard configuration file or paste its content to automatically configure a new relay interface.
                </p>

                {/* File picker */}
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 font-semibold cursor-pointer transition-colors">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{importFileName || 'Choose .conf file'}</span>
                    <input
                      type="file"
                      accept=".conf,text/plain"
                      onChange={handleConfFileUpload}
                      className="hidden"
                    />
                  </label>
                  {importFileName && (
                    <button
                      type="button"
                      onClick={() => {
                        setImportFileName('');
                        setImportText('');
                        setImportParsed(null);
                      }}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Paste Area */}
                <div>
                  <textarea
                    rows={3}
                    value={importText}
                    onChange={(e) => handleConfTextChange(e.target.value)}
                    placeholder="Or paste [Interface] / [Peer] config text here..."
                    className="w-full p-3 rounded-xl bg-white dark:bg-neutral-800 border border-black/[0.06] dark:border-white/[0.08] font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                {importError && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{importError}</span>
                    </div>
                    <CopyButton
                      text={importError}
                      label="Copy"
                      copiedLabel="Copied!"
                      size="xs"
                      className="bg-red-500/15 hover:bg-red-500/25 text-red-700 dark:text-red-300 border-red-500/30"
                    />
                  </div>
                )}

                {/* Parsed Preview Card */}
                {importParsed && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                        Parsed Configuration Preview
                      </span>
                      <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 uppercase">
                        Valid WireGuard Conf
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-neutral-400 uppercase">Interface ID:</span>
                        <input
                          type="text"
                          value={importParsed.suggestedId}
                          onChange={(e) =>
                            setImportParsed({ ...importParsed, suggestedId: e.target.value })
                          }
                          className="w-full mt-0.5 px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-neutral-400 uppercase">Label:</span>
                        <input
                          type="text"
                          value={importParsed.suggestedLabel}
                          onChange={(e) =>
                            setImportParsed({ ...importParsed, suggestedLabel: e.target.value })
                          }
                          className="w-full mt-0.5 px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
                        />
                      </div>
                      <div className="col-span-2">
                        <span className="text-neutral-400 uppercase">Endpoint:</span>
                        <p className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                          {importParsed.endpoint}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveImportedRelay}
                      disabled={importing}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Provisioning Relay...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Deploy This Relay Location</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ROUTER & POLICY */}
          {activeTab === 'router' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Router Connectivity & Policy
                </h4>
                <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Authorize SSH key access, configure router host IP, and manage policy routing enforcement.
                </p>
              </div>

              {/* Native OpenWrt Daemon Architecture Card */}
              <div className="p-4 rounded-2xl bg-blue-500/5 dark:bg-blue-400/5 border-2 border-blue-500/20 dark:border-blue-400/20 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                        Native OpenWrt Deployment
                      </h5>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Native OpenWrt Service · Managed by <code className="font-mono">procd</code>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                    ● Localhost Native
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.05]">
                    <span className="text-neutral-400 block text-[10px]">Service Daemon</span>
                    <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">/usr/bin/waypoint</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.05]">
                    <span className="text-neutral-400 block text-[10px]">Port</span>
                    <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">8443 (HTTP)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.05]">
                    <span className="text-neutral-400 block text-[10px]">IPC Channel</span>
                    <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">/usr/sbin/vpnctl</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.05]">
                    <span className="text-neutral-400 block text-[10px]">Latency</span>
                    <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">&lt; 1 ms</span>
                  </div>
                </div>
              </div>

              {/* Live Daemon Logs & Diagnostic Console */}
              <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                      Live Router & Daemon Diagnostic Logs
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                      {logs.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={fetchLogs}
                      disabled={loadingLogs}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-200/80 hover:bg-neutral-300/80 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Refresh logs from router"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyLogs}
                      disabled={logs.length === 0}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      {copiedLogs ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Logs</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleClearLogs}
                      disabled={clearingLogs || logs.length === 0}
                      className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40"
                      title="Clear logs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="bg-neutral-900 rounded-xl p-3 font-mono text-[10px] text-neutral-300 h-48 overflow-y-auto space-y-1 select-text border border-white/[0.05]">
                  {logs.length === 0 ? (
                    <div className="text-neutral-500 text-center py-8">
                      {loadingLogs ? 'Loading daemon logs...' : 'No log entries yet.'}
                    </div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed flex items-start gap-2">
                        <span className="text-neutral-500 shrink-0 select-none">[{log.time}]</span>
                        <span
                          className={`shrink-0 font-semibold px-1 rounded text-[9px] ${
                            log.level === 'ERROR'
                              ? 'bg-rose-500/20 text-rose-400'
                              : log.level === 'WARN'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="break-all">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05]">
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Strict Killswitch Mode
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Immediately drop traffic if a device's assigned WireGuard tunnel goes down, preventing WAN leaks.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formSettings.router.strictKillswitch}
                  onChange={(e) =>
                    setFormSettings((prev) => ({
                      ...prev,
                      router: { ...prev.router, strictKillswitch: e.target.checked },
                    }))
                  }
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05]">
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Vibrate className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Haptic Vibration Feedback</span>
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Provide subtle micro-vibrations when tapping tunnel pills on mobile touch devices.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formSettings.ui.hapticsEnabled}
                  onChange={(e) =>
                    setFormSettings((prev) => ({
                      ...prev,
                      ui: { ...prev.ui, hapticsEnabled: e.target.checked },
                    }))
                  }
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* PWA Cache & App Update Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05]">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
                    <span>PWA Cache & App Version</span>
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    If your mobile PWA is showing an older layout or doesn't update, clear the service worker cache and reload.
                  </p>
                </div>
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
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold cursor-pointer shrink-0 transition-colors text-center"
                >
                  Clear Cache & Reload
                </button>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Telemetry Polling Interval ({formSettings.router.pollingIntervalSeconds}s)
                </label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={formSettings.router.pollingIntervalSeconds}
                  onChange={(e) =>
                    setFormSettings((prev) => ({
                      ...prev,
                      router: {
                        ...prev.router,
                        pollingIntervalSeconds: parseInt(e.target.value, 10),
                      },
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                  <span>5s (fast)</span>
                  <span>10s (standard)</span>
                  <span>60s (low router load)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SSL & WEB SERVER */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Web Server Port & SSL Security
                </h4>
                <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Configure the native HTTP/HTTPS listen port, generate Certificate Signing Requests (CSR), and install signed SSL/TLS certificates.
                </p>
              </div>

              {/* CARD 1: WEB SERVER PORT */}
              <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                      Web Server Port
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                    Current: {webPort}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Default port is <strong>8443</strong>. Ports 80 and 443 are reserved by OpenWrt for LuCI. Selecting a custom port updates the procd daemon and restarts the service.
                </p>

                <div className="flex items-center gap-2.5">
                  <div className="w-36">
                    <input
                      type="number"
                      min="1"
                      max="65535"
                      value={webPort}
                      onChange={(e) => setWebPort(parseInt(e.target.value, 10) || 8443)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-mono text-xs focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSavePort}
                    disabled={savingPort || webPort === (sslStatus?.web_port || 8443)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {savingPort ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Applying...</span>
                      </>
                    ) : (
                      <span>Apply Port</span>
                    )}
                  </button>
                </div>

                {portMessage && (
                  <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    {portMessage}
                  </p>
                )}
              </div>

              {/* CARD 2: HTTPS & CERTIFICATE STATUS */}
              <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                      HTTPS / SSL Status
                    </span>
                  </div>

                  {sslStatus?.ssl_enabled ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      HTTPS Active
                    </span>
                  ) : sslStatus?.has_cert ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      Cert Ready (Inactive)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                      HTTP Plaintext
                    </span>
                  )}
                </div>

                {sslStatus?.has_cert ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.05]">
                        <span className="text-[10px] text-neutral-400 block">Certificate Subject</span>
                        <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200 break-all">
                          {sslStatus.subject || 'N/A'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.05]">
                        <span className="text-[10px] text-neutral-400 block">Issuer</span>
                        <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200 break-all">
                          {sslStatus.issuer || 'Custom / Self-Signed'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.05]">
                        <span className="text-[10px] text-neutral-400 block">Valid Until</span>
                        <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {sslStatus.valid_to || 'N/A'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-neutral-900/60 border border-black/[0.04] dark:border-white/[0.05]">
                        <span className="text-[10px] text-neutral-400 block">Subject Alternative Names</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {sslStatus.sans && sslStatus.sans.length > 0 ? (
                            sslStatus.sans.map((s, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 font-mono text-[9px] text-neutral-700 dark:text-neutral-300"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-400 font-mono text-[10px]">None</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {sslStatus.ssl_enabled ? (
                        <button
                          type="button"
                          onClick={() => handleToggleSsl(false)}
                          disabled={togglingSsl}
                          className="px-3 py-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {togglingSsl ? 'Disabling...' : 'Switch to Plaintext HTTP'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleSsl(true)}
                          disabled={togglingSsl}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{togglingSsl ? 'Activating...' : 'Activate HTTPS'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    No SSL certificate is currently installed. Generate a Certificate Signing Request (CSR) below to get a certificate signed, or upload an existing valid certificate.
                  </p>
                )}
              </div>

              {/* CARD 3: GENERATE CSR */}
              <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                      1. Generate Certificate Signing Request (CSR)
                    </span>
                  </div>
                  {generatedCsr && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>CSR Ready</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Creates an Elliptic Curve (P-256) private key on the router and produces a CSR to submit to your Certificate Authority (Let&apos;s Encrypt, Cloudflare, Active Directory, Step-CA, etc.).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Common Name / Primary Domain *
                    </label>
                    <input
                      type="text"
                      value={csrCommonName}
                      onChange={(e) => setCsrCommonName(e.target.value)}
                      placeholder="e.g. router.lan or 192.168.10.1"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-mono focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Subject Alternative Names (SANs)
                    </label>
                    <input
                      type="text"
                      value={csrSans}
                      onChange={(e) => setCsrSans(e.target.value)}
                      placeholder="e.g. 192.168.10.1, router.lan, router.local"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-mono focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="w-1/2 pr-2">
                    <label className="block text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Organization (Optional)
                    </label>
                    <input
                      type="text"
                      value={csrOrg}
                      onChange={(e) => setCsrOrg(e.target.value)}
                      placeholder="e.g. WayPoint Home Lab"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleGenerateCsr}
                      disabled={generatingCsr}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {generatingCsr ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-3.5 h-3.5" />
                          <span>Generate Key &amp; CSR</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {csrError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                    {csrError}
                  </p>
                )}

                {generatedCsr && (
                  <div className="space-y-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                        Generated CSR Content
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedCsr);
                            setCopiedCsr(true);
                            setTimeout(() => setCopiedCsr(false), 2000);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedCsr ? 'Copied!' : 'Copy CSR'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadCsr}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download .csr</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      readOnly
                      rows={5}
                      value={generatedCsr}
                      className="w-full p-2.5 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[10px] leading-relaxed resize-none focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* CARD 4: UPLOAD & INSTALL SIGNED CERTIFICATE */}
              <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.05] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                      2. Install Signed Certificate
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Paste or upload the signed X.509 certificate PEM (including any fullchain / intermediate certificates) received from your CA.
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
                      Certificate Content (PEM format)
                    </label>
                    <label className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Choose .crt / .pem file</span>
                      <input
                        type="file"
                        accept=".crt,.pem,.cer"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const content = event.target?.result as string;
                              if (content) setCertPem(content);
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <textarea
                    rows={5}
                    value={certPem}
                    onChange={(e) => setCertPem(e.target.value)}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-mono text-[10px] leading-relaxed resize-none focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {certError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                    {certError}
                  </p>
                )}

                {certSuccess && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{certSuccess}</span>
                  </p>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleInstallCert}
                    disabled={uploadingCert || !certPem.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
                  >
                    {uploadingCert ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying &amp; Installing...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Install Certificate &amp; Enable HTTPS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-neutral-900/30">
          <span className="text-[11px] text-neutral-400">
            {saveSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Settings saved successfully!</span>
              </span>
            ) : (
              'Changes take effect immediately'
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm shadow-blue-500/25 transition-all cursor-pointer touch-press disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
