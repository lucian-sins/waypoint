import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { CopyButton } from './CopyButton';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  title?: string;
  verbatim?: string | null;
  onRetry?: () => void;
}

interface SnackbarProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const hasExpandedError = toasts.some((t) => t.type === 'error');

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 w-full px-4 pointer-events-none safe-bottom transition-all duration-300 ${
        hasExpandedError ? 'max-w-xl sm:max-w-2xl' : 'max-w-md'
      }`}
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isInfo = toast.type === 'info';
        const fullTrace = [toast.title, toast.message, toast.verbatim].filter(Boolean).join('\n\n');

        if (isError) {
          return (
            <div
              key={toast.id}
              className="pointer-events-auto w-full p-4 sm:p-5 rounded-3xl shadow-xl backdrop-blur-md border border-red-200/90 dark:border-red-500/30 bg-white/95 dark:bg-[#1f1616]/95 text-neutral-900 dark:text-neutral-100 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-200"
            >
              {/* Header Row: Icon + Title + Action Controls */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-red-950 dark:text-red-100 tracking-tight truncate">
                        {toast.title || 'Execution Error'}
                      </h4>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 font-semibold border border-red-500/20">
                        Error
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Actions: Copy + Retry + Dismiss */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <CopyButton
                    text={fullTrace}
                    label="Copy Error"
                    copiedLabel="Copied!"
                    title="Copy full error trace to clipboard"
                    size="xs"
                    className="bg-red-500/15 hover:bg-red-500/25 text-red-700 dark:text-red-300 border-red-500/30 font-semibold"
                  />
                  {toast.onRetry && (
                    <button
                      onClick={toast.onRetry}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={() => onDismiss(toast.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Dismiss"
                    aria-label="Dismiss error notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Error Explanation Message */}
              {toast.message && (
                <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed pl-10">
                  {toast.message}
                </p>
              )}

              {/* Diagnostic Verbatim Trace Box */}
              {toast.verbatim && toast.verbatim !== toast.message && (
                <div className="mt-2 rounded-2xl bg-neutral-100 dark:bg-black/60 text-neutral-800 dark:text-neutral-200 border border-neutral-200/90 dark:border-white/10 overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-neutral-200/60 dark:bg-neutral-900/90 border-b border-neutral-200/90 dark:border-neutral-800/80 text-[10px] font-mono text-neutral-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-300">
                      <Terminal className="w-3 h-3 text-red-500 dark:text-red-400" />
                      <span>Diagnostic Trace</span>
                    </span>
                    <span className="opacity-70 text-[10px]">stderr / vpnctl</span>
                  </div>
                  <pre className="p-3.5 font-mono text-[11px] leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap break-all text-neutral-800 dark:text-neutral-200 select-text">
                    {toast.verbatim}
                  </pre>
                </div>
              )}
            </div>
          );
        }

        // Standard Success & Info Toast
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl shadow-lg backdrop-blur-md border border-neutral-200/90 dark:border-white/10 bg-white/95 dark:bg-[#232733]/95 text-neutral-800 dark:text-neutral-100 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {isInfo ? (
                <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs sm:text-sm font-medium truncate">{toast.message}</p>
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
