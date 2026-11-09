import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Globe2,
  Plus,
  Loader2,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Key,
  Network,
  Sliders,
} from 'lucide-react';
import type { AddTunnelPayload, WireguardConfigParseResult } from '../lib/types';
import { COUNTRY_PRESETS } from '../lib/locations';
import { parseWireguardConf } from '../lib/wireguardParser';
import { FlagIcon } from './FlagIcon';
import { CopyButton } from './CopyButton';

interface AddTunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTunnel: (tunnel: AddTunnelPayload) => Promise<void>;
  initialTab?: 'conf' | 'manual';
}

const PRESET_LIST = [
  { code: 'jp', city: 'Tokyo', flag: '🇯🇵' },
  { code: 'nl', city: 'Amsterdam', flag: '🇳🇱' },
  { code: 'ch', city: 'Zurich', flag: '🇨🇭' },
  { code: 'fr', city: 'Paris', flag: '🇫🇷' },
  { code: 'ca', city: 'Montreal', flag: '🇨🇦' },
  { code: 'sg', city: 'Singapore', flag: '🇸🇬' },
  { code: 'au', city: 'Sydney', flag: '🇦🇺' },
  { code: 'se', city: 'Stockholm', flag: '🇸🇪' },
  { code: 'es', city: 'Madrid', flag: '🇪🇸' },
  { code: 'br', city: 'São Paulo', flag: '🇧🇷' },
  { code: 'ar', city: 'Buenos Aires', flag: '🇦🇷' },
  { code: 'mx', city: 'Mexico City', flag: '🇲🇽' },
];

export const AddTunnelModal: React.FC<AddTunnelModalProps> = ({
  isOpen,
  onClose,
  onAddTunnel,
  initialTab = 'conf',
}) => {
  const [activeTab, setActiveTab] = useState<'conf' | 'manual'>(initialTab);

  // Manual Mode State
  const [manualId, setManualId] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  const [manualEndpoint, setManualEndpoint] = useState('');
  const [manualProvider, setManualProvider] = useState('surfshark');

  // Conf Import Mode State
  const [confText, setConfText] = useState('');
  const [confFileName, setConfFileName] = useState('');
  const [parsedConf, setParsedConf] = useState<WireguardConfigParseResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading & Error States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setError(null);
    } else {
      // Reset on close
      setConfText('');
      setConfFileName('');
      setParsedConf(null);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Process text or file into parsed WireGuard result
  const handleParseText = (text: string, fileName: string = '') => {
    setConfText(text);
    if (!text.trim()) {
      setParsedConf(null);
      setError(null);
      return;
    }
    try {
      const parsed = parseWireguardConf(text, fileName || confFileName || 'wireguard.conf');
      if (!parsed.endpoint) {
        setError('No Endpoint found in config (expected "Endpoint = host:port").');
        setParsedConf(null);
      } else {
        setParsedConf(parsed);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse configuration');
      setParsedConf(null);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setConfFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleParseText(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setConfFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleParseText(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleApplyPreset = (code: string, city: string) => {
    const preset = COUNTRY_PRESETS[code];
    setManualId(`wg${code}`);
    setManualLabel(`${code.toUpperCase()} / ${city}`);
    setManualEndpoint(preset?.defaultEndpoint || '');
    setError(null);
  };

  const handleConfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedConf || !parsedConf.endpoint) {
      setError('Please provide a valid WireGuard configuration with an Endpoint.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onAddTunnel({
        id: parsedConf.suggestedId,
        label: parsedConf.suggestedLabel,
        endpoint: parsedConf.endpoint,
        provider: 'wireguard-conf',
        confContent: parsedConf.rawText || confText,
        privateKey: parsedConf.privateKey,
        address: parsedConf.address,
        publicKey: parsedConf.publicKey,
        dns: parsedConf.dns,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to deploy WireGuard location to router.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId || !manualLabel || !manualEndpoint) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onAddTunnel({
        id: manualId,
        label: manualLabel,
        endpoint: manualEndpoint,
        provider: manualProvider,
      });
      setManualId('');
      setManualLabel('');
      setManualEndpoint('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add location.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/30 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#232733] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Add WireGuard Location
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Register a new egress tunnel on your OpenWrt router
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/80 border border-black/[0.04] dark:border-white/[0.05] shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('conf');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'conf'
                ? 'bg-white dark:bg-[#25272c] text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Import .conf File</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-[#25272c] text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Manual & Presets</span>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <div className="break-all">{error}</div>
            </div>
            <CopyButton
              text={error}
              label="Copy"
              copiedLabel="Copied!"
              size="xs"
              className="bg-red-500/15 hover:bg-red-500/25 text-red-700 dark:text-red-300 border-red-500/30"
            />
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
          {activeTab === 'conf' ? (
            /* TAB 1: IMPORT .CONF */
            <form onSubmit={handleConfSubmit} className="space-y-4 text-xs">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : parsedConf
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-emerald-500/60 dark:hover:border-emerald-400/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".conf,text/plain"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                    parsedConf
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                  }`}
                >
                  {parsedConf ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">
                    {confFileName
                      ? `File: ${confFileName}`
                      : 'Drop your WireGuard .conf file here'}
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    or click to browse from Surfshark, Mullvad, Proton, NordVPN, etc.
                  </p>
                </div>
              </div>

              {/* Paste Text Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Or Paste Configuration Text</span>
                  </label>
                  {confText && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfText('');
                        setConfFileName('');
                        setParsedConf(null);
                        setError(null);
                      }}
                      className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={confText}
                  onChange={(e) => handleParseText(e.target.value)}
                  placeholder="[Interface]&#10;PrivateKey = ...&#10;Address = 10.2.0.2/32&#10;&#10;[Peer]&#10;PublicKey = ...&#10;Endpoint = 185.156.x.x:51820"
                  className="w-full p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/70 border border-black/[0.06] dark:border-white/[0.08] font-mono text-[11px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {/* Parsed Live Preview Card */}
              {parsedConf && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FlagIcon
                        tunnelId={parsedConf.suggestedId}
                        countryCode={parsedConf.countryCode}
                        label={parsedConf.suggestedLabel}
                        flag={parsedConf.flag}
                        size="md"
                      />
                      <div>
                        <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs block">
                          Configuration Ready to Provision
                        </span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                          Valid WireGuard parameters detected
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                        Interface ID
                      </label>
                      <input
                        type="text"
                        value={parsedConf.suggestedId}
                        onChange={(e) =>
                          setParsedConf({
                            ...parsedConf,
                            suggestedId: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-black/[0.08] dark:border-white/[0.1] font-mono font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="wgnl"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                        Location Label
                      </label>
                      <input
                        type="text"
                        value={parsedConf.suggestedLabel}
                        onChange={(e) =>
                          setParsedConf({
                            ...parsedConf,
                            suggestedLabel: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-black/[0.08] dark:border-white/[0.1] font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="NL / Amsterdam"
                        required
                      />
                    </div>

                    <div className="col-span-2 p-2.5 rounded-xl bg-white/80 dark:bg-neutral-800/80 border border-black/[0.04] dark:border-white/[0.05] space-y-1.5 font-mono text-[11px]">
                      <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                        <span className="flex items-center gap-1.5 text-neutral-500">
                          <Network className="w-3.5 h-3.5" />
                          <span>Endpoint:</span>
                        </span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {parsedConf.endpoint}
                        </span>
                      </div>

                      {parsedConf.address && (
                        <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                          <span className="text-neutral-500">Client IP:</span>
                          <span>{parsedConf.address}</span>
                        </div>
                      )}

                      {parsedConf.dns && (
                        <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                          <span className="text-neutral-500">DNS:</span>
                          <span>{parsedConf.dns}</span>
                        </div>
                      )}

                      {parsedConf.publicKey && (
                        <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                          <span className="flex items-center gap-1.5 text-neutral-500">
                            <Key className="w-3.5 h-3.5" />
                            <span>Peer Key:</span>
                          </span>
                          <span className="text-[10px] truncate max-w-[190px]">
                            {parsedConf.publicKey}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25 transition-all cursor-pointer touch-press disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Provisioning on Router...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Import & Provision Location</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* TAB 2: MANUAL & PRESETS */
            <form onSubmit={handleManualSubmit} className="space-y-3.5 text-xs">
              {/* Quick Country Presets */}
              <div>
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
                  Quick Country Presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_LIST.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleApplyPreset(item.code, item.city)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      <FlagIcon countryCode={item.code} flag={item.flag} size="sm" />
                      <span>{item.city}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300">
                    Interface ID (e.g. wgjp, wguk, wgbr)
                  </label>
                  {(manualId || manualLabel) && (
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 select-none">
                      <span>Flag:</span>
                      <FlagIcon tunnelId={manualId} label={manualLabel} size="sm" />
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value.toLowerCase())}
                  placeholder="wgjp"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-black/[0.06] dark:border-white/[0.08] text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Display Label
                </label>
                <input
                  type="text"
                  value={manualLabel}
                  onChange={(e) => setManualLabel(e.target.value)}
                  placeholder="JP / Tokyo"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-black/[0.06] dark:border-white/[0.08] text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  WireGuard Peer Endpoint (IP:Port)
                </label>
                <input
                  type="text"
                  value={manualEndpoint}
                  onChange={(e) => setManualEndpoint(e.target.value)}
                  placeholder="146.70.180.2:51820"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-black/[0.06] dark:border-white/[0.08] text-sm text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Provider
                </label>
                <select
                  value={manualProvider}
                  onChange={(e) => setManualProvider(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-black/[0.06] dark:border-white/[0.08] text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="surfshark">Surfshark</option>
                  <option value="mullvad">Mullvad</option>
                  <option value="nordvpn">NordVPN</option>
                  <option value="custom">Custom / Self-hosted</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition-all cursor-pointer touch-press disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Adding Location...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Location</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
