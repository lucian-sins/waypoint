import React from 'react';
import { Globe } from 'lucide-react';

export type ServiceId =
  | 'crunchyroll'
  | 'youtube'
  | 'netflix'
  | 'disney'
  | 'max'
  | 'hbo'
  | 'bbc'
  | 'prime'
  | 'twitch'
  | 'steam'
  | 'plex'
  | 'emby'
  | 'spotify'
  | 'apple'
  | 'appletv'
  | 'hulu'
  | 'paramount'
  | 'peacock'
  | 'espn'
  | 'dazn'
  | 'itvx'
  | 'channel4'
  | 'tubi'
  | 'pluto'
  | 'discovery'
  | 'tidal'
  | 'rtve'
  | 'movistar'
  | 'custom';

interface ServiceIconProps {
  serviceKey?: string;
  name?: string;
  domains?: string[];
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function detectService(
  serviceKey?: string,
  name?: string,
  domains?: string[]
): ServiceId {
  const key = (serviceKey || '').toLowerCase();
  const n = (name || '').toLowerCase();
  const dStr = (domains || []).join(' ').toLowerCase();
  const full = `${key} ${n} ${dStr}`;

  if (full.includes('crunchyroll') || full.includes('vrv')) return 'crunchyroll';
  if (full.includes('youtube') || full.includes('googlevideo') || full.includes('youtu.be')) return 'youtube';
  if (full.includes('netflix') || full.includes('nflx')) return 'netflix';
  if (full.includes('disney') || full.includes('dssott') || full.includes('bamgrid') || full.includes('starplus')) return 'disney';
  if (full.includes('hulu')) return 'hulu';
  if (full.includes('paramount') || full.includes('cbs')) return 'paramount';
  if (full.includes('peacock') || full.includes('nbc')) return 'peacock';
  if (full.includes('espn')) return 'espn';
  if (full.includes('dazn')) return 'dazn';
  if (full.includes('itvx') || full.includes('itv')) return 'itvx';
  if (full.includes('channel4') || full.includes('c4assets') || full.includes('channel 4') || full.includes('all 4') || full.includes('all4')) return 'channel4';
  if (full.includes('tubi')) return 'tubi';
  if (full.includes('pluto')) return 'pluto';
  if (full.includes('discovery')) return 'discovery';
  if (full.includes('max') || full.includes('hbomax') || full.includes('hbo')) return 'max';
  if (full.includes('bbc') || full.includes('iplayer')) return 'bbc';
  if (full.includes('prime') || full.includes('amazonvideo') || full.includes('aiv-cdn')) return 'prime';
  if (full.includes('twitch') || full.includes('ttvnw')) return 'twitch';
  if (full.includes('steam') || full.includes('valvesoftware')) return 'steam';
  if (full.includes('plex')) return 'plex';
  if (full.includes('emby') || full.includes('jellyfin')) return 'emby';
  if (full.includes('spotify') || full.includes('scdn')) return 'spotify';
  if (full.includes('tidal')) return 'tidal';
  if (full.includes('apple') || full.includes('itunes')) return 'appletv';
  if (full.includes('rtve')) return 'rtve';
  if (full.includes('movistar') || full.includes('telefonica')) return 'movistar';

  return 'custom';
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({
  serviceKey,
  name,
  domains,
  size = 'md',
  className = '',
}) => {
  const service = detectService(serviceKey, name, domains);

  const dimensionClass = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  }[size];

  switch (service) {
    case 'crunchyroll':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Crunchyroll"
          role="img"
        >
          <path
            fill="#F47521"
            d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12c1.765 0 3.44-.382 4.95-1.07-3.98-.396-7.116-3.754-7.116-7.854 0-4.348 3.528-7.876 7.876-7.876.847 0 1.66.134 2.423.382C18.667 3.02 15.552 0 12 0zm5.176 9.412a3.176 3.176 0 1 0 0 6.353 3.176 3.176 0 0 0 0-6.353z"
          />
        </svg>
      );

    case 'youtube':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="YouTube"
          role="img"
        >
          <path
            fill="#FF0000"
            d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
          />
        </svg>
      );

    case 'netflix':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Netflix"
          role="img"
        >
          <path fill="#B81D24" d="M5.398 0v24c1.866-.353 3.738-.725 5.61-1.077V0H5.398z" />
          <path fill="#B81D24" d="M13.602 0v22.203c1.872-.258 3.738-.504 5.61-.741V0h-5.61z" />
          <path
            fill="#E50914"
            d="M5.398 0l13.814 23.462c-1.872.237-3.738.483-5.61.741L4.212 1.488A59.398 59.398 0 0 1 5.398 0z"
          />
        </svg>
      );

    case 'disney':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Disney+"
          role="img"
        >
          <path
            fill="#113CCF"
            d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z"
            opacity="0.12"
          />
          <path
            fill="#113CCF"
            d="M11.666 4.316c.465.173.81.42 1.034.74.225.32.285.674.18 1.062a2.316 2.316 0 0 1-.585.96c-.3.308-.71.554-1.23.74-.294.103-.665.187-1.112.253a9.775 9.775 0 0 0-1.65.426 6.86 6.86 0 0 0-1.74.92c-.525.4-.87.892-1.035 1.478-.166.586-.11 1.25.166 1.99.27.74.77 1.43 1.5 2.07.73.64 1.69 1.15 2.88 1.53 1.19.38 2.54.57 4.05.57 2.14 0 4.1-.38 5.88-1.14v-2.07a12.7 12.7 0 0 1-5.61 1.26c-1.28 0-2.39-.14-3.33-.42-.94-.28-1.67-.67-2.19-1.17-.52-.5-.78-1.07-.78-1.71 0-.64.22-1.2.66-1.68.44-.48 1.07-.86 1.89-1.14.82-.28 1.83-.46 3.03-.54 1.2-.08 2.53-.12 3.99-.12h1.95v-1.95c0-1.22-.38-2.19-1.14-2.91-.76-.72-1.83-1.08-3.21-1.08-1.16 0-2.28.24-3.36.72a9.66 9.66 0 0 0-2.82 1.98l-1.32-1.5c1.1-1 2.39-1.76 3.87-2.28 1.48-.52 3.04-.78 4.68-.78 2.16 0 3.86.58 5.1 1.74 1.24 1.16 1.86 2.76 1.86 4.8v8.61h-2.1v-2.37c-.76.84-1.71 1.5-2.85 1.98-1.14.48-2.43.72-3.87.72-1.68 0-3.17-.23-4.47-.69-1.3-.46-2.35-1.1-3.15-1.92-.8-.82-1.35-1.79-1.65-2.91-.3-1.12-.27-2.31.09-3.57.36-1.26 1.04-2.34 2.04-3.24 1-1 2.3-1.76 3.9-2.28 1.6-.52 3.48-.78 5.64-.78h.84v-.48c0-.96-.28-1.7-.84-2.22-.56-.52-1.4-.78-2.52-.78-.92 0-1.83.18-2.73.54-.9.36-1.74.9-2.52 1.62l-1.26-1.56c1-1 2.15-1.76 3.45-2.28 1.3-.52 2.71-.78 4.23-.78 1.88 0 3.39.46 4.53 1.38 1.14.92 1.71 2.26 1.71 4.02v3.78z"
          />
        </svg>
      );

    case 'max':
    case 'hbo':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Max / HBO"
          role="img"
        >
          <path
            fill="#002BE7"
            d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-5.4 7.2h2.4v3.6h2.4V7.2h2.4v9.6h-2.4v-3.6H9v3.6H6.6V7.2zm9.6 0h2.4c1.988 0 3.6 1.612 3.6 3.6v2.4c0 1.988-1.612 3.6-3.6 3.6h-2.4V7.2zm2.4 7.2c.663 0 1.2-.537 1.2-1.2v-2.4c0-.663-.537-1.2-1.2-1.2h-.6v4.8h.6z"
          />
        </svg>
      );

    case 'bbc':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="BBC iPlayer"
          role="img"
        >
          <rect x="1" y="6" width="6.5" height="12" rx="1.5" fill="#F54997" />
          <rect x="8.75" y="6" width="6.5" height="12" rx="1.5" fill="#F54997" />
          <rect x="16.5" y="6" width="6.5" height="12" rx="1.5" fill="#F54997" />
          <path
            fill="#ffffff"
            d="M3.2 8.5h2.2c.8 0 1.3.3 1.3.8 0 .4-.2.7-.6.8.5.1.8.4.8.9 0 .6-.6.9-1.5.9H3.2V8.5zm1 1.5h1.1c.3 0 .5-.1.5-.3 0-.2-.2-.3-.5-.3H4.2v.6zm0 1.5h1.2c.4 0 .6-.1.6-.4 0-.3-.2-.4-.6-.4H4.2v.8zm7.8-3h2.2c.8 0 1.3.3 1.3.8 0 .4-.2.7-.6.8.5.1.8.4.8.9 0 .6-.6.9-1.5.9H12V8.5zm1 1.5h1.1c.3 0 .5-.1.5-.3 0-.2-.2-.3-.5-.3H13v.6zm0 1.5h1.2c.4 0 .6-.1.6-.4 0-.3-.2-.4-.6-.4H13v.8zm8.7-.3c-.2-.6-.7-1-1.4-1-.9 0-1.5.6-1.5 1.5v1.6c0 .9.6 1.5 1.5 1.5.7 0 1.2-.4 1.4-1l.9.4c-.4.9-1.2 1.4-2.3 1.4-1.5 0-2.5-1-2.5-2.4v-1.6c0-1.4 1-2.4 2.5-2.4 1.1 0 1.9.5 2.3 1.4l-.9.6z"
          />
        </svg>
      );

    case 'prime':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Prime Video"
          role="img"
        >
          <path
            fill="#00A8E1"
            d="M22.04 16.51c-2.44 1.76-5.83 2.7-8.86 2.7-4.25 0-8.08-1.55-10.98-4.14-.23-.21-.03-.49.24-.33 3.14 1.83 6.99 2.93 10.74 2.93 2.68 0 5.61-.63 8.3-1.92.41-.2.78.3.56.76zM22.9 14.86c-.31-.39-2.03-.18-2.8-.09-.23.03-.27-.15-.06-.29 1.35-.94 3.56-.67 3.82-.35.26.32-.07 2.53-1.35 3.56-.19.16-.38.07-.3-.13.27-.69.9-2.4.69-2.7zM14.61 5.4h2.12v7.94h-2.12V5.4zm-5.46 2.7c1.39 0 2.25.96 2.25 2.45v2.79H9.37V10.7c0-.82-.41-1.27-1.14-1.27-.75 0-1.24.52-1.24 1.31v2.6H4.96V8.25h1.94v.85c.57-.65 1.33-.95 2.25-.95z"
          />
        </svg>
      );

    case 'twitch':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Twitch"
          role="img"
        >
          <path
            fill="#9146FF"
            d="M2.149 0L.537 4.119v16.143h5.452V24h3.763l3.655-3.738h4.407L23.463 14.6V0H2.149zm19.165 13.568l-3.224 3.298h-4.836l-3.118 3.192v-3.192H5.918V2.149h15.396v11.419zm-3.762-6.864h-2.15v6.236h2.15V6.704zm-5.374 0h-2.15v6.236h2.15V6.704z"
          />
        </svg>
      );

    case 'steam':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Steam"
          role="img"
        >
          <path
            fill="#66C0F4"
            d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12zM8.366 17.07l-1.956-.808c.355.637.994 1.096 1.748 1.189-.204-.37-.308-.78-.308-1.209.001-.284.053-.556.147-.807l.369.635zm7.575-10.428c-1.258 0-2.277 1.02-2.277 2.277 0 1.258 1.019 2.277 2.277 2.277 1.257 0 2.277-1.019 2.277-2.277 0-1.257-1.02-2.277-2.277-2.277zm-8.312 9.53c0 .878.712 1.59 1.59 1.59.877 0 1.59-.712 1.59-1.59s-.713-1.59-1.59-1.59c-.878 0-1.59.712-1.59 1.59z"
          />
        </svg>
      );

    case 'plex':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Plex"
          role="img"
        >
          <path fill="#E5A00D" d="M11.643 0H4.68l7.32 12-7.32 12h6.963l7.32-12-7.32-12z" />
        </svg>
      );

    case 'emby':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Emby"
          role="img"
        >
          <path
            fill="#52B54B"
            d="M11.082 1.026c-.73-.42-1.634-.42-2.364 0L1.742 5.051C1.012 5.47.56 6.253.56 7.094v8.051c0 .841.452 1.623 1.182 2.043l6.976 4.025c.73.42 1.634.42 2.364 0l6.976-4.025c.73-.42 1.182-1.202 1.182-2.043V7.094c0-.841-.452-1.624-1.182-2.043L11.082 1.026zm-2.01 14.195V8.779l5.006 3.221-5.006 3.221z"
          />
        </svg>
      );

    case 'spotify':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Spotify"
          role="img"
        >
          <path
            fill="#1ED760"
            d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
          />
        </svg>
      );

    case 'apple':
    case 'appletv':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Apple TV+"
          role="img"
        >
          <path
            fill="currentColor"
            d="M9.8 16.5c-.5.8-1.1 1.6-1.9 1.6-.8 0-1.1-.5-2-.5s-1.3.5-2.1.5c-.9 0-1.5-.9-2-1.6C.8 14.8-.2 12 .9 10c.6-1 1.6-1.6 2.6-1.6.8 0 1.6.6 2.1.6s1.5-.7 2.4-.6c.4 0 1.6.2 2.4 1.3-.1 0-1.4.8-1.4 2.5 0 2 1.7 2.6 1.8 2.7-.1.2-.4 1-.9 1.7M8 8.1c.4-.5.7-1.2.6-1.9-.6 0-1.3.4-1.7.9-.4.4-.7 1.1-.6 1.8.6.1 1.3-.3 1.7-.8z"
          />
          <path
            fill="currentColor"
            d="M12.4 10.2H11V8.8h4.2v1.4h-1.4v6.2h-1.4v-6.2zm3.6 0l1.3 4.8 1.3-4.8h1.6l-2 6.2h-1.6l-2-6.2H16z"
          />
          <path
            fill="#0071E3"
            d="M22.5 11.2h.9v1.2h-.9v.9h-1.2v-.9h-.9v-1.2h.9v-.9h1.2v.9z"
          />
        </svg>
      );

    case 'hulu':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Hulu"
          role="img"
        >
          <path
            fill="#1CE783"
            d="M5.27 0v8.94A4.32 4.32 0 0 1 8.84 7.2c2.8 0 4.36 1.84 4.36 5.12V24H8.85v-10.7c0-1.5-.72-2.3-2.04-2.3-1.42 0-2.33 1.05-2.33 2.65V24H0V0h5.27zm10.74 7.2v10.92c0 1.5.72 2.3 2.04 2.3 1.42 0 2.33-1.05 2.33-2.65V7.2H24V24h-5.27v-1.74a4.32 4.32 0 0 1-3.57 1.94c-2.8 0-4.36-1.84-4.36-5.12V7.2h5.21z"
          />
        </svg>
      );

    case 'paramount':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Paramount+"
          role="img"
        >
          <path
            fill="#0064FF"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 5l4.5 9h-9L11 7zm7.5 5.5h-1.5v-1.5h-1.2v1.5h-1.5v1.2h1.5v1.5h1.2v-1.5h1.5v-1.2z"
          />
          <polygon points="11,9 8,15 14,15" fill="#ffffff" />
          <polygon points="11,9 9.5,12 12.5,12" fill="#0064FF" />
        </svg>
      );

    case 'peacock':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Peacock"
          role="img"
        >
          <circle cx="5" cy="14" r="2.1" fill="#00A859" />
          <circle cx="6.5" cy="8.8" r="2.1" fill="#FFD100" />
          <circle cx="10.2" cy="5.2" r="2.1" fill="#F37023" />
          <circle cx="14.8" cy="5.2" r="2.1" fill="#ED1C24" />
          <circle cx="18.5" cy="8.8" r="2.1" fill="#9B268E" />
          <circle cx="20" cy="14" r="2.1" fill="#0072CE" />
          <path
            fill="currentColor"
            d="M12.5 10.5c-.8 0-1.5.8-1.5 1.7 0 1.2.8 2.2 1.2 3.8.1.5.3 1.2.3 1.7h0c0-.5.2-1.2.3-1.7.4-1.6 1.2-2.6 1.2-3.8 0-.9-.7-1.7-1.5-1.7z"
          />
        </svg>
      );

    case 'espn':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="ESPN+"
          role="img"
        >
          <path
            fill="#CC0000"
            d="M2 7.5h13.5v2.2H4.8v1.8h10.7v2.2H4.8v2H15.5v2.3H2V7.5zm15.5 3h2v-2h1.6v2h2v1.6h-2v2h-1.6v-2h-2v-1.6z"
          />
        </svg>
      );

    case 'dazn':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="DAZN"
          role="img"
        >
          <rect width="24" height="24" rx="4.5" fill="#111111" />
          <path
            fill="#F8F800"
            d="M4 6.5h3.2c2.4 0 4 1.4 4 3.7v3.6c0 2.3-1.6 3.7-4 3.7H4V6.5zm3.1 8.8c1.1 0 1.8-.7 1.8-1.7V9.4c0-1-.7-1.7-1.8-1.7H6.2v7.6h.9zm6.1-8.8h6.8v2.1l-4.5 6.6h4.5v2.3h-6.8v-2.1l4.5-6.6h-4.5V6.5z"
          />
        </svg>
      );

    case 'itvx':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="ITVX"
          role="img"
        >
          <rect width="24" height="24" rx="4.5" fill="#0A0A0C" />
          <path fill="#00E5FF" d="M3.5 8.5h2.2v7H3.5v-7zm3.3 0h4.5v1.8H10v5.2H8.2v-5.2H6.8V8.5z" />
          <path
            fill="#FFE600"
            d="M13.2 8.5h2.2l1.6 2.8 1.6-2.8h2.2l-2.6 4.2 2.7 4.3h-2.2l-1.7-2.9-1.7 2.9h-2.2l2.7-4.3-2.6-4.2z"
          />
        </svg>
      );

    case 'channel4':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Channel 4"
          role="img"
        >
          <rect width="24" height="24" rx="4.5" fill="#141E28" />
          <path
            fill="#00E59B"
            d="M14.5 4h2.2v10.5H19v2.2h-2.3V20h-2.2v-3.3H6.8V14.5L14.5 4zm0 4.2L9.6 14.5h4.9V8.2z"
          />
        </svg>
      );

    case 'tubi':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Tubi"
          role="img"
        >
          <rect width="24" height="24" rx="4.5" fill="#FA541C" />
          <path
            fill="#FFFFFF"
            d="M4.5 8h6v2.2H8.7v7.3H6.3v-7.3H4.5V8zm7.5 3.2h2.2v4.8c0 .8.5 1.3 1.2 1.3.7 0 1.2-.5 1.2-1.3v-4.8H19v4.8c0 2-1.3 3.3-3.4 3.3-2.1 0-3.6-1.3-3.6-3.3v-4.8z"
          />
        </svg>
      );

    case 'pluto':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Pluto TV"
          role="img"
        >
          <circle cx="12" cy="12" r="10" fill="#FFEC00" />
          <circle cx="12" cy="12" r="5.5" fill="#000000" />
          <circle cx="12" cy="12" r="2.5" fill="#FFFFFF" />
        </svg>
      );

    case 'discovery':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Discovery+"
          role="img"
        >
          <path
            fill="#0275D8"
            d="M4.5 4h6.5C16.8 4 20 7.2 20 12s-3.2 8-9 8H4.5V4zm3 3v10h3.5c3.6 0 5.5-2.2 5.5-5s-1.9-5-5.5-5H7.5z"
          />
          <circle cx="11.5" cy="12" r="2.8" fill="#5CB85C" />
        </svg>
      );

    case 'rtve':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="RTVE Play"
          role="img"
        >
          <rect width="24" height="24" rx="4.5" fill="#003580" />
          <path fill="#FF7700" d="M8.5 7.5l9 4.5-9 4.5V7.5z" />
        </svg>
      );

    case 'movistar':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Movistar Plus+"
          role="img"
        >
          <rect width="24" height="24" rx="4.5" fill="#019DF4" />
          <path
            fill="#FFFFFF"
            d="M4 14.5c.8-3.2 2.2-6 4.3-6 1.8 0 2.8 1.9 3.7 4.2.9-2.3 1.9-4.2 3.7-4.2 2.1 0 3.5 2.8 4.3 6-1.5.8-2.6 1.5-4 1.5-1.5 0-2.4-1.3-3.2-3.1-.8 1.8-1.7 3.1-3.2 3.1-1.4 0-2.5-.7-4-1.5z"
          />
          <path fill="#5BC500" d="M19.5 5.5h1.5v1.5h-1.5V8.5h-1.5V7h-1.5V5.5h1.5V4h1.5v1.5z" />
        </svg>
      );

    case 'tidal':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${dimensionClass} shrink-0 select-none ${className}`}
          aria-label="Tidal"
          role="img"
        >
          <path
            fill="currentColor"
            d="M12 4.243l2.828 2.829L12 9.9 9.172 7.071 12 4.243zm-5.657 5.657l2.829 2.828L6.343 15.557l-2.828-2.829 2.828-2.828zm5.657 0l2.828 2.828L12 15.557l-2.828-2.829L12 9.9zm5.657 0l2.828 2.828-2.828 2.829-2.829-2.829 2.829-2.828z"
          />
        </svg>
      );

    case 'custom':
    default:
      return (
        <Globe
          className={`${dimensionClass} shrink-0 text-neutral-500 dark:text-neutral-400 ${className}`}
        />
      );
  }
};
