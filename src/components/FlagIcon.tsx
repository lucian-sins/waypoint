import React, { useState } from 'react';
import { getTunnelCountryCode, countryCodeToFlag } from '../lib/locations';

interface FlagIconProps {
  countryCode?: string | null;
  tunnelId?: string;
  label?: string;
  flag?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FlagIcon: React.FC<FlagIconProps> = ({
  countryCode,
  tunnelId,
  label,
  flag,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  // If direct WAN, render the clean globe
  if (tunnelId === 'direct' || countryCode === 'direct') {
    return (
      <span className={`inline-flex items-center justify-center select-none text-sm ${className}`}>
        🌐
      </span>
    );
  }

  // Determine 2-letter ISO country code
  const code = (
    countryCode ||
    (tunnelId || label ? getTunnelCountryCode(tunnelId || '', label || '') : null)
  )?.toLowerCase();

  // If no code or image failed to load, return emoji fallback
  if (!code || imgError) {
    const fallbackEmoji = flag || (code ? countryCodeToFlag(code) : '🛡️');
    return (
      <span className={`inline-flex items-center justify-center select-none text-base leading-none ${className}`}>
        {fallbackEmoji}
      </span>
    );
  }

  // Size dimensions:
  // sm: compact buttons (16x11)
  // md: standard pills & badges (20x14)
  // lg: large 44x44 card icons in WireGuard Locations (28x19)
  const sizeClasses = {
    sm: 'w-4 h-2.5 rounded-[2px]',
    md: 'w-5 h-3.5 rounded-[3px]',
    lg: 'w-7 h-5 rounded-[4px]',
  }[size];

  return (
    <span className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      <img
        src={`https://flagcdn.com/w40/${code}.png`}
        srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
        alt={code.toUpperCase()}
        loading="lazy"
        onError={() => setImgError(true)}
        className={`${sizeClasses} object-cover shadow-[0_1px_2px_rgba(0,0,0,0.18)] ring-1 ring-black/10 dark:ring-white/10`}
      />
    </span>
  );
};
