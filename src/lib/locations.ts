import type { Tunnel, TunnelOption } from './types';

/**
 * Converts any standard 2-letter ISO 3166-1 alpha-2 country code into its official Unicode flag emoji.
 * Works dynamically for all 249 country codes worldwide.
 */
export function countryCodeToFlag(code: string): string {
  if (!code || typeof code !== 'string') return '🛡️';
  let clean = code.trim().toUpperCase();
  if (clean === 'UK') clean = 'GB'; // Map UK to official GB ISO indicator
  if (clean.length !== 2) return '🛡️';

  const c1 = clean.charCodeAt(0);
  const c2 = clean.charCodeAt(1);
  if (c1 < 65 || c1 > 90 || c2 < 65 || c2 > 90) return '🛡️';

  return String.fromCodePoint(c1 + 127397, c2 + 127397);
}

/**
 * World VPN City -> ISO 2-letter Country Code Mapping
 */
const CITY_TO_COUNTRY: Record<string, string> = {
  // United States
  'new york': 'US',
  nyc: 'US',
  'los angeles': 'US',
  la: 'US',
  miami: 'US',
  chicago: 'US',
  dallas: 'US',
  seattle: 'US',
  atlanta: 'US',
  'san francisco': 'US',
  denver: 'US',
  ashburn: 'US',
  phoenix: 'US',
  'las vegas': 'US',
  houston: 'US',
  boston: 'US',
  // Spain
  madrid: 'ES',
  barcelona: 'ES',
  valencia: 'ES',
  seville: 'ES',
  sevilla: 'ES',
  // United Kingdom
  london: 'GB',
  manchester: 'GB',
  glasgow: 'GB',
  edinburgh: 'GB',
  birmingham: 'GB',
  // Germany
  frankfurt: 'DE',
  berlin: 'DE',
  munich: 'DE',
  dusseldorf: 'DE',
  hamburg: 'DE',
  // Netherlands
  amsterdam: 'NL',
  rotterdam: 'NL',
  // France
  paris: 'FR',
  marseille: 'FR',
  lyon: 'FR',
  // Japan
  tokyo: 'JP',
  osaka: 'JP',
  // Switzerland
  zurich: 'CH',
  geneva: 'CH',
  basel: 'CH',
  // Canada
  toronto: 'CA',
  montreal: 'CA',
  vancouver: 'CA',
  calgary: 'CA',
  // Australia
  sydney: 'AU',
  melbourne: 'AU',
  brisbane: 'AU',
  perth: 'AU',
  // Singapore
  singapore: 'SG',
  // Sweden
  stockholm: 'SE',
  // Italy
  milan: 'IT',
  milano: 'IT',
  rome: 'IT',
  roma: 'IT',
  // Ireland
  dublin: 'IE',
  // Austria
  vienna: 'AT',
  wien: 'AT',
  // Belgium
  brussels: 'BE',
  bruxelles: 'BE',
  // Poland
  warsaw: 'PL',
  warszawa: 'PL',
  // Portugal
  lisbon: 'PT',
  lisboa: 'PT',
  porto: 'PT',
  // Finland
  helsinki: 'FI',
  // Norway
  oslo: 'NO',
  // Denmark
  copenhagen: 'DK',
  // Czechia
  prague: 'CZ',
  praha: 'CZ',
  // Hungary
  budapest: 'HU',
  // Romania
  bucharest: 'RO',
  bucuresti: 'RO',
  // Greece
  athens: 'GR',
  // Turkey
  istanbul: 'TR',
  ankara: 'TR',
  // Ukraine
  kyiv: 'UA',
  kiev: 'UA',
  // South Korea
  seoul: 'KR',
  // Taiwan
  taipei: 'TW',
  // Hong Kong
  'hong kong': 'HK',
  // India
  mumbai: 'IN',
  delhi: 'IN',
  bangalore: 'IN',
  // Brazil
  'sao paulo': 'BR',
  'são paulo': 'BR',
  'rio de janeiro': 'BR',
  rio: 'BR',
  // Argentina
  'buenos aires': 'AR',
  // Chile
  santiago: 'CL',
  // Colombia
  bogota: 'CO',
  bogotá: 'CO',
  // Mexico
  'mexico city': 'MX',
  guadalajara: 'MX',
  // South Africa
  johannesburg: 'ZA',
  'cape town': 'ZA',
  // UAE
  dubai: 'AE',
  'abu dhabi': 'AE',
  // Israel
  'tel aviv': 'IL',
  // New Zealand
  auckland: 'NZ',
  wellington: 'NZ',
  // Iceland
  reykjavik: 'IS',
  // Luxembourg
  luxembourg: 'LU',
  // Thailand
  bangkok: 'TH',
  // Malaysia
  'kuala lumpur': 'MY',
  // Indonesia
  jakarta: 'ID',
  // Philippines
  manila: 'PH',
  // Vietnam
  hanoi: 'VN',
  'ho chi minh': 'VN',
};

/**
 * Country Names (English, Spanish, native) -> ISO 2-letter Code Mapping
 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'US',
  usa: 'US',
  'estados unidos': 'US',
  spain: 'ES',
  españa: 'ES',
  espana: 'ES',
  'united kingdom': 'GB',
  'great britain': 'GB',
  england: 'GB',
  'reino unido': 'GB',
  germany: 'DE',
  deutschland: 'DE',
  alemania: 'DE',
  france: 'FR',
  francia: 'FR',
  italy: 'IT',
  italia: 'IT',
  netherlands: 'NL',
  holland: 'NL',
  'países bajos': 'NL',
  'paises bajos': 'NL',
  switzerland: 'CH',
  schweiz: 'CH',
  suisse: 'CH',
  suiza: 'CH',
  canada: 'CA',
  canadá: 'CA',
  australia: 'AU',
  japan: 'JP',
  japón: 'JP',
  japon: 'JP',
  nippon: 'JP',
  singapore: 'SG',
  singapur: 'SG',
  sweden: 'SE',
  sverige: 'SE',
  suecia: 'SE',
  norway: 'NO',
  norge: 'NO',
  noruega: 'NO',
  denmark: 'DK',
  danmark: 'DK',
  dinamarca: 'DK',
  finland: 'FI',
  suomi: 'FI',
  finlandia: 'FI',
  poland: 'PL',
  polska: 'PL',
  polonia: 'PL',
  portugal: 'PT',
  ireland: 'IE',
  irlanda: 'IE',
  austria: 'AT',
  belgium: 'BE',
  belgique: 'BE',
  bélgica: 'BE',
  belgica: 'BE',
  brazil: 'BR',
  brasil: 'BR',
  mexico: 'MX',
  méxico: 'MX',
  argentina: 'AR',
  chile: 'CL',
  colombia: 'CO',
  india: 'IN',
  korea: 'KR',
  'south korea': 'KR',
  corea: 'KR',
  'hong kong': 'HK',
  taiwan: 'TW',
  taiwán: 'TW',
  'new zealand': 'NZ',
  'nueva zelanda': 'NZ',
  'south africa': 'ZA',
  sudáfrica: 'ZA',
  sudafrica: 'ZA',
  israel: 'IL',
  uae: 'AE',
  emirates: 'AE',
  'emiratos arabes': 'AE',
  turkey: 'TR',
  türkiye: 'TR',
  turquía: 'TR',
  turquia: 'TR',
  ukraine: 'UA',
  ucrania: 'UA',
  romania: 'RO',
  rumanía: 'RO',
  rumania: 'RO',
  'czech republic': 'CZ',
  czechia: 'CZ',
  chequia: 'CZ',
  hungary: 'HU',
  hungría: 'HU',
  hungria: 'HU',
  greece: 'GR',
  grecia: 'GR',
  bulgaria: 'BG',
  croatia: 'HR',
  croacia: 'HR',
  slovakia: 'SK',
  eslovaquia: 'SK',
  slovenia: 'SI',
  eslovenia: 'SI',
  estonia: 'EE',
  latvia: 'LV',
  letonia: 'LV',
  lithuania: 'LT',
  lituania: 'LT',
  iceland: 'IS',
  islandia: 'IS',
  luxembourg: 'LU',
  luxemburgo: 'LU',
  cyprus: 'CY',
  chipre: 'CY',
  malta: 'MT',
  thailand: 'TH',
  tailandia: 'TH',
  malaysia: 'MY',
  malasia: 'MY',
  indonesia: 'ID',
  philippines: 'PH',
  filipinas: 'PH',
  vietnam: 'VN',
  serbia: 'RS',
  bosnia: 'BA',
  montenegro: 'ME',
  albania: 'AL',
  moldova: 'MD',
  georgia: 'GE',
  armenia: 'AM',
  azerbaijan: 'AZ',
  kazakhstan: 'KZ',
  saudi: 'SA',
  qatar: 'QA',
  kuwait: 'KW',
  bahrain: 'BH',
  oman: 'OM',
  jordan: 'JO',
  egypt: 'EG',
  morocco: 'MA',
  marruecos: 'MA',
  tunisia: 'TN',
  algeria: 'DZ',
  nigeria: 'NG',
  kenya: 'KE',
  ghana: 'GH',
  peru: 'PE',
  perú: 'PE',
  ecuador: 'EC',
  uruguay: 'UY',
  paraguay: 'PY',
  bolivia: 'BO',
  'costa rica': 'CR',
  panama: 'PA',
  panamá: 'PA',
  pakistan: 'PK',
  bangladesh: 'BD',
};

/**
 * Universal presets list for quick adding
 */
export const COUNTRY_PRESETS: Record<string, { name: string; flag: string; defaultEndpoint: string }> = {
  us: { name: 'United States', flag: '🇺🇸', defaultEndpoint: '' },
  es: { name: 'Spain', flag: '🇪🇸', defaultEndpoint: '' },
  gb: { name: 'United Kingdom', flag: '🇬🇧', defaultEndpoint: '' },
  de: { name: 'Germany', flag: '🇩🇪', defaultEndpoint: '' },
  nl: { name: 'Netherlands', flag: '🇳🇱', defaultEndpoint: '' },
  fr: { name: 'France', flag: '🇫🇷', defaultEndpoint: '' },
  ch: { name: 'Switzerland', flag: '🇨🇭', defaultEndpoint: '' },
  it: { name: 'Italy', flag: '🇮🇹', defaultEndpoint: '' },
  ca: { name: 'Canada', flag: '🇨🇦', defaultEndpoint: '' },
  au: { name: 'Australia', flag: '🇦🇺', defaultEndpoint: '' },
  jp: { name: 'Japan', flag: '🇯🇵', defaultEndpoint: '' },
  sg: { name: 'Singapore', flag: '🇸🇬', defaultEndpoint: '' },
  se: { name: 'Sweden', flag: '🇸🇪', defaultEndpoint: '' },
  no: { name: 'Norway', flag: '🇳🇴', defaultEndpoint: '' },
  dk: { name: 'Denmark', flag: '🇩🇰', defaultEndpoint: '' },
  fi: { name: 'Finland', flag: '🇫🇮', defaultEndpoint: '' },
  pl: { name: 'Poland', flag: '🇵🇱', defaultEndpoint: '' },
  pt: { name: 'Portugal', flag: '🇵🇹', defaultEndpoint: '' },
  ie: { name: 'Ireland', flag: '🇮🇪', defaultEndpoint: '' },
  at: { name: 'Austria', flag: '🇦🇹', defaultEndpoint: '' },
  be: { name: 'Belgium', flag: '🇧🇪', defaultEndpoint: '' },
  br: { name: 'Brazil', flag: '🇧🇷', defaultEndpoint: '' },
  mx: { name: 'Mexico', flag: '🇲🇽', defaultEndpoint: '' },
  ar: { name: 'Argentina', flag: '🇦🇷', defaultEndpoint: '' },
  za: { name: 'South Africa', flag: '🇿🇦', defaultEndpoint: '' },
  in: { name: 'India', flag: '🇮🇳', defaultEndpoint: '' },
  kr: { name: 'South Korea', flag: '🇰🇷', defaultEndpoint: '' },
  nz: { name: 'New Zealand', flag: '🇳🇿', defaultEndpoint: '' },
};

/**
 * Universal Flag Resolver: Resolves the official country flag for ANY tunnel location worldwide.
 */
export function getTunnelFlag(tunnelId: string, label: string = '', endpoint: string = ''): string {
  if (tunnelId === 'direct') return '🌐';

  // 1. Direct ID slug extraction (e.g. "wgus" -> "us", "wges" -> "es", "wg_uk" -> "gb", "tun_jp" -> "jp", "wg-ch" -> "ch")
  const idSlug = tunnelId.toLowerCase().replace(/^(wg|tun|tunnel)[_-]?/, '').trim();
  if (idSlug.length === 2 && /^[a-z]{2}$/.test(idSlug)) {
    return countryCodeToFlag(idSlug);
  }

  // 2. Search by city in label and id
  const text = `${label} ${tunnelId} ${endpoint}`.toLowerCase();
  for (const [city, code] of Object.entries(CITY_TO_COUNTRY)) {
    if (text.includes(city)) {
      return countryCodeToFlag(code);
    }
  }

  // 3. Search by country name
  for (const [countryName, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    if (text.includes(countryName)) {
      return countryCodeToFlag(code);
    }
  }

  // 4. Look for standalone 2-letter uppercase or lowercase country code in label (e.g. "US / New York", "ES-Madrid", "UK")
  const codeMatches = text.match(/\b([a-z]{2})\b/g);
  if (codeMatches) {
    for (const match of codeMatches) {
      if (match !== 'wg' && match !== 'ip' && match !== 'up' && match !== 'to' && match !== 'at' && match !== 'in' && match !== 'on') {
        const flag = countryCodeToFlag(match);
        if (flag !== '🛡️') return flag;
      }
    }
  }

  return '🛡️';
}

/**
 * Universal Country Code Resolver: Returns the 2-letter ISO country code for ANY tunnel or label.
 */
export function getTunnelCountryCode(tunnelId: string, label: string = '', endpoint: string = ''): string | null {
  if (tunnelId === 'direct') return null;

  // 1. Direct ID slug extraction (e.g. "wgus" -> "us", "wges" -> "es", "wg_uk" -> "gb")
  const idSlug = tunnelId.toLowerCase().replace(/^(wg|tun|tunnel)[_-]?/, '').trim();
  if (idSlug.length === 2 && /^[a-z]{2}$/.test(idSlug)) {
    return idSlug === 'uk' ? 'gb' : idSlug;
  }

  // 2. Search by city in label and id
  const text = `${label} ${tunnelId} ${endpoint}`.toLowerCase();
  for (const [city, code] of Object.entries(CITY_TO_COUNTRY)) {
    if (text.includes(city)) {
      return code.toLowerCase();
    }
  }

  // 3. Search by country name
  for (const [countryName, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    if (text.includes(countryName)) {
      return code.toLowerCase();
    }
  }

  // 4. Look for standalone 2-letter code
  const codeMatches = text.match(/\b([a-z]{2})\b/g);
  if (codeMatches) {
    for (const match of codeMatches) {
      if (match !== 'wg' && match !== 'ip' && match !== 'up' && match !== 'to' && match !== 'at' && match !== 'in' && match !== 'on') {
        const flag = countryCodeToFlag(match);
        if (flag !== '🛡️') return match === 'uk' ? 'gb' : match.toLowerCase();
      }
    }
  }

  return null;
}

/**
 * Converts a list of active tunnels into dynamic TunnelOption pills for the UI
 */
export function buildTunnelOptions(tunnels: Tunnel[]): TunnelOption[] {
  const options: TunnelOption[] = [
    {
      id: 'direct',
      label: 'Direct WAN',
      shortLabel: 'Direct',
      flag: '🌐',
      country_code: undefined,
      isDirect: true,
    },
  ];

  for (const tunnel of tunnels) {
    const flag = tunnel.flag || getTunnelFlag(tunnel.id, tunnel.label, tunnel.endpoint);
    const country_code = tunnel.country_code || getTunnelCountryCode(tunnel.id, tunnel.label, tunnel.endpoint) || undefined;
    const rawShort = tunnel.label.split('/')[0]?.trim() || tunnel.label;
    const shortLabel = (rawShort && rawShort.length <= 4)
      ? rawShort
      : (country_code ? country_code.toUpperCase() : rawShort);

    options.push({
      id: tunnel.id,
      label: tunnel.label,
      shortLabel,
      flag,
      country_code,
      isDirect: false,
      latency_ms: tunnel.latency_ms,
    });
  }

  return options;
}
