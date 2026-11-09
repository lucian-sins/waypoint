import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'ghost' | 'pill' | 'solid';
  title?: string;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  // Fallback for non-secure contexts or embedded webviews
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    }
  } catch {}
  return false;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label,
  copiedLabel = 'Copied!',
  className = '',
  size = 'xs',
  variant = 'pill',
  title = 'Copy to clipboard',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = await copyToClipboard(text);
    if (ok) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(12);
        } catch {}
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  const basePadding = {
    xs: label ? 'px-2 py-0.5 text-[10px]' : 'p-1',
    sm: label ? 'px-2.5 py-1 text-xs' : 'p-1.5',
    md: label ? 'px-3 py-1.5 text-xs' : 'p-2',
  };

  const variantStyles = {
    pill: copied
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
      : 'bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white border border-black/[0.06] dark:border-white/[0.08]',
    ghost: copied
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
      : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]',
    solid: copied
      ? 'bg-emerald-600 text-white'
      : 'bg-neutral-800 hover:bg-neutral-900 text-white dark:bg-neutral-700 dark:hover:bg-neutral-600',
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? copiedLabel : title}
      aria-label={copied ? copiedLabel : title}
      className={`inline-flex items-center gap-1 font-medium rounded-lg transition-all duration-150 cursor-pointer select-none shrink-0 ${basePadding[size]} ${variantStyles[variant]} ${className}`}
    >
      {copied ? (
        <Check className={`${iconSizes[size]} text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75 duration-150 shrink-0`} />
      ) : (
        <Copy className={`${iconSizes[size]} shrink-0`} />
      )}
      {(label || copied) && (
        <span className="truncate">{copied ? copiedLabel : label}</span>
      )}
    </button>
  );
};
