import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Tv,
  Tablet,
  Shield,
  Loader2,
  Check,
  Pencil,
  X,
  Cpu,
  Building2,
  Lightbulb,
  ArrowDown,
  ArrowUp,
  Star,
  Tag,
  ChevronDown,
} from 'lucide-react';
import type { Device, TunnelOption } from '../lib/types';
import { FlagIcon } from './FlagIcon';
import { isUnnamedDevice, getDeviceSuggestions } from '../lib/macVendor';
import { formatBytes } from '../lib/formatters';

interface DeviceCardProps {
  device: Device;
  tunnelOptions: TunnelOption[];
  onTunnelChange: (ip: string, tunnel: string) => Promise<void>;
  onRenameDevice: (ip: string, name: string, icon?: Device['icon'], category?: string) => Promise<void>;
  onToggleFavorite?: (id: string) => void;
  isMutating: boolean;
  hasError: boolean;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  tunnelOptions,
  onTunnelChange,
  onRenameDevice,
  onToggleFavorite,
  isMutating,
  hasError,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(device.name);
  const [editIcon, setEditIcon] = useState<Device['icon']>(device.icon || 'laptop');
  const [editCategory, setEditCategory] = useState(device.category || '');
  const [savingName, setSavingName] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Device icon picker
  const renderIcon = (iconType = device.icon) => {
    const iconClass = 'w-5 h-5 text-neutral-700 dark:text-neutral-200';
    switch (iconType) {
      case 'phone':
        return <Smartphone className={iconClass} />;
      case 'laptop':
        return <Laptop className={iconClass} />;
      case 'tv':
        return <Tv className={iconClass} />;
      case 'tablet':
        return <Tablet className={iconClass} />;
      case 'iot':
        return <Cpu className={iconClass} />;
      default:
        return <Laptop className={iconClass} />;
    }
  };

  const currentOption = tunnelOptions.find((opt) => opt.id === device.tunnel) || {
    id: device.tunnel,
    label: device.tunnel === 'direct' ? 'Direct' : device.tunnel,
    shortLabel: device.tunnel === 'direct' ? 'Direct' : device.tunnel,
    flag: device.tunnel === 'direct' ? '🌐' : '🛡️',
  };

  const handleSelect = (targetTunnel: string) => {
    if (device.tunnel === targetTunnel || isMutating) return;

    // Micro-haptic trigger on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }

    onTunnelChange(device.ip, targetTunnel);
  };

  const handleSaveRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editName.trim() || savingName) return;

    setSavingName(true);
    try {
      await onRenameDevice(device.ip, editName.trim(), editIcon, editCategory.trim() || undefined);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to rename device:', err);
    } finally {
      setSavingName(false);
    }
  };

  const isUnnamed = isUnnamedDevice(device);
  const suggestions = getDeviceSuggestions(device);

  return (
    <div
      className={`relative group rounded-3xl p-4 sm:p-5 transition-all duration-200 ${
        hasError ? 'animate-shake border-red-500/40 shadow-red-500/10' : ''
      } ${
        device.isFavorite
          ? 'bg-white dark:bg-[#232733] border-amber-500/30 dark:border-amber-500/25 shadow-sm hover:shadow-md'
          : 'bg-white dark:bg-[#232733] border-black/[0.06] dark:border-white/[0.08] shadow-sm hover:shadow-md'
      }`}
    >
      {/* Top Row: Icon + Name + IP + Status */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800/90 border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center shrink-0">
            {renderIcon(isEditing ? editIcon : device.icon)}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <form onSubmit={handleSaveRename} className="space-y-2 py-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsEditing(false);
                        setEditName(device.name);
                      }
                    }}
                    className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-blue-500 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none min-w-[130px] flex-1"
                    placeholder="Device Name"
                  />

                  <select
                    value={editIcon}
                    onChange={(e) => setEditIcon(e.target.value as any)}
                    className="px-2 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer focus:outline-none"
                  >
                    <option value="phone">Phone</option>
                    <option value="laptop">Laptop</option>
                    <option value="tv">TV / Audio</option>
                    <option value="tablet">Tablet</option>
                    <option value="iot">IoT / Smart</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      type="submit"
                      disabled={savingName || !editName.trim()}
                      className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors disabled:opacity-50"
                      title="Save name"
                    >
                      {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(device.name);
                      }}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Category / Room Tag Row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-500">
                    <Tag className="w-3 h-3 text-blue-500 shrink-0" />
                    <input
                      type="text"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      placeholder="Room / Tag..."
                      className="bg-transparent border-none text-xs font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none w-24 sm:w-28 placeholder:text-neutral-400"
                    />
                  </div>
                  {['Living Room', 'Office', 'Bedrooms', 'Work', 'IoT'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditCategory(editCategory === preset ? '' : preset)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                        editCategory === preset
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Suggestions chip row */}
                {suggestions && suggestions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-neutral-400 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-amber-500" />
                      <span>Suggestions:</span>
                    </span>
                    {suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setEditName(sug);
                          const lower = sug.toLowerCase();
                          if (lower.includes('echo') || lower.includes('tv') || lower.includes('speaker') || lower.includes('playstation') || lower.includes('xbox') || lower.includes('roku') || lower.includes('sonos')) {
                            setEditIcon('tv');
                          } else if (lower.includes('plug') || lower.includes('bulb') || lower.includes('printer') || lower.includes('switch') || lower.includes('smart') || lower.includes('hue') || lower.includes('esp')) {
                            setEditIcon('iot');
                          } else if (lower.includes('phone') || lower.includes('iphone') || lower.includes('android')) {
                            setEditIcon('phone');
                          } else if (lower.includes('ipad') || lower.includes('tablet')) {
                            setEditIcon('tablet');
                          } else {
                            setEditIcon('laptop');
                          }
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 border border-black/[0.04] dark:border-white/[0.05] transition-colors cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </form>
            ) : (
              <div className="flex items-center gap-2 group/title flex-wrap">
                <h3 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
                  {device.name}
                </h3>
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                        try {
                          navigator.vibrate(10);
                        } catch {}
                      }
                      onToggleFavorite(
                        device.mac && device.mac !== '00:00:00:00:00:00'
                          ? device.mac.toLowerCase()
                          : device.ip
                      );
                    }}
                    className={`p-1 rounded-md transition-all duration-150 cursor-pointer touch-press ${
                      device.isFavorite
                        ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400 bg-amber-500/10'
                        : 'text-neutral-300 dark:text-neutral-600 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                    title={device.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    aria-label={
                      device.isFavorite
                        ? `Remove ${device.name} from favorites`
                        : `Add ${device.name} to favorites`
                    }
                  >
                    <Star
                      className={`w-3.5 h-3.5 transition-transform duration-150 ${
                        device.isFavorite
                          ? 'fill-amber-400 text-amber-500 dark:fill-amber-400 dark:text-amber-400 scale-110'
                          : ''
                      }`}
                    />
                  </button>
                )}
                {isUnnamed && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    No Hostname
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditName(isUnnamed ? (suggestions[0] || '') : device.name);
                    setEditIcon(device.icon || 'laptop');
                    setIsEditing(true);
                  }}
                  className="opacity-75 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer inline-flex items-center gap-1"
                  title="Rename device"
                  aria-label={`Rename ${device.name}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {isUnnamed && (
                    <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      Rename
                    </span>
                  )}
                </button>
                {device.static && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    Static
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              <span className="font-mono tabular-nums font-medium text-neutral-700 dark:text-neutral-300">{device.ip}</span>
              <span className="text-neutral-300 dark:text-neutral-600">·</span>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono">
                {device.mac}
              </span>
              {device.vendor && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-600">·</span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                      device.isRandomizedMac
                        ? 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400'
                        : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                    }`}
                    title={`Hardware Manufacturer: ${device.vendor}`}
                  >
                    {device.isRandomizedMac ? (
                      <Shield className="w-3 h-3 text-neutral-400 shrink-0" />
                    ) : (
                      <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                    <span>{device.vendor}</span>
                  </span>
                </>
              )}
              {device.category && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-600">·</span>
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                    title={`Room / Category: ${device.category}`}
                  >
                    <Tag className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                    <span>{device.category}</span>
                  </span>
                </>
              )}
              {((device.rx_bytes && device.rx_bytes > 0) || (device.tx_bytes && device.tx_bytes > 0)) ? (
                <>
                  <span className="text-neutral-300 dark:text-neutral-600">·</span>
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 border border-black/[0.04] dark:border-white/[0.05]"
                    title={`Traffic consumed: ${formatBytes(device.rx_bytes)} download / ${formatBytes(device.tx_bytes)} upload`}
                  >
                    <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
                      <ArrowDown className="w-2.5 h-2.5 mr-0.5" />
                      {formatBytes(device.rx_bytes)}
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-600">/</span>
                    <span className="inline-flex items-center text-blue-600 dark:text-blue-400">
                      <ArrowUp className="w-2.5 h-2.5 mr-0.5" />
                      {formatBytes(device.tx_bytes)}
                    </span>
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Current Active Route Badge (Interactive Toggle for Hidden Location Picker) */}
        <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
          <button
            type="button"
            onClick={() => setIsPickerOpen((prev) => !prev)}
            disabled={isMutating}
            aria-expanded={isPickerOpen}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition-all duration-150 cursor-pointer select-none touch-press border ${
              device.tunnel === 'direct'
                ? 'bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-800 dark:text-neutral-200 border-black/[0.06] dark:border-white/[0.08]'
                : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm shadow-blue-500/25 font-bold'
            }`}
            title="Click to change routing egress location"
          >
            <FlagIcon
              tunnelId={currentOption.id}
              countryCode={currentOption.country_code}
              flag={currentOption.flag}
              size="sm"
            />
            <span className="font-semibold">{currentOption.shortLabel}</span>
            {isMutating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-current" />
            ) : (
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isPickerOpen ? 'rotate-180 opacity-100' : 'opacity-60'
                }`}
              />
            )}
          </button>

          {device.tunnel !== 'direct' && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/60"
              title="Strict killswitch: if WireGuard drops, this device has no internet rather than leaking unencrypted"
            >
              <Shield className="w-2.5 h-2.5" />
              Strict Protected
            </span>
          )}
        </div>
      </div>

      {/* Hidden Location Selector (Appears only when user taps location badge) */}
      {isPickerOpen && (
        <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] animate-in fade-in duration-150 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <span>Select Routing Egress</span>
              <span className="text-[11px] font-normal text-neutral-400">
                ({tunnelOptions.length} destinations)
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsPickerOpen(false)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close picker"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {tunnelOptions.map((option) => {
              const isSelected = device.tunnel === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    handleSelect(option.id);
                    setIsPickerOpen(false);
                  }}
                  disabled={isMutating}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer touch-press ${
                    isSelected
                      ? option.id === 'direct'
                        ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-semibold shadow-xs ring-1 ring-black/10 dark:ring-white/10'
                        : 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/25 ring-1 ring-blue-500'
                      : 'bg-neutral-100/90 hover:bg-neutral-200/80 dark:bg-neutral-800/80 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-neutral-300'
                  } ${isMutating && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FlagIcon
                      tunnelId={option.id}
                      countryCode={option.country_code}
                      flag={option.flag}
                      size="sm"
                    />
                    <span className="truncate">{option.label || option.shortLabel}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 shrink-0 opacity-90" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
