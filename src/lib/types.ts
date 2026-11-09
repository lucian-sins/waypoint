export type TunnelId = string;

export interface Device {
  name: string;
  mac: string;
  ip: string;
  static: boolean;
  tunnel: string; // "direct" | "wgus" | "wges" | "wguk" | etc.
  policy: string;
  online: boolean;
  rx_bytes?: number;
  tx_bytes?: number;
  icon?: 'phone' | 'laptop' | 'tv' | 'tablet' | 'iot' | 'device';
  vendor?: string;
  isRandomizedMac?: boolean;
  isFavorite?: boolean;
  category?: string;
}

export interface Tunnel {
  id: string; // e.g. "wgus", "wges", "wguk", "wgde"
  label: string; // e.g. "US / New York", "UK / London"
  provider: string; // e.g. "surfshark", "mullvad", "custom"
  country_code?: string; // e.g. "US", "ES", "GB", "DE", "JP"
  flag?: string; // e.g. "🇺🇸", "🇪🇸", "🇬🇧"
  state: 'up' | 'down';
  handshake_age_s: number;
  rx_bytes: number;
  tx_bytes: number;
  endpoint: string;
  devices: string[]; // Device IPs routed through this tunnel
  latency_ms?: number | null; // Ping RTT in milliseconds
}

export interface TunnelOption {
  id: string; // "direct" or interface id like "wgus"
  label: string;
  flag: string;
  country_code?: string;
  shortLabel: string;
  isDirect?: boolean;
  latency_ms?: number | null;
}

export interface RouterStatus {
  router: {
    release: string;
    uptime_s: number;
    wan_up: boolean;
    wan_ip: string;
  };
  pbr: {
    enabled: boolean;
    strict: boolean;
    policies: number;
  };
  tunnels_active?: number;
  devices_online?: number;
}

export interface AppSettings {
  subnets: string[]; // e.g. ["192.168.10.0/24"]
  router: {
    mode: 'mock' | 'live';
    host: string;
    sshKeyPath: string;
    strictKillswitch: boolean;
    pollingIntervalSeconds: number;
  };
  server?: {
    port: number;
    ssl_enabled: boolean;
  };
  ui: {
    hapticsEnabled: boolean;
  };
  deviceAliases?: Record<string, { name: string; icon?: Device['icon']; category?: string }>;
  favorites?: string[]; // Synced favorite device MACs / IPs across all clients
}

export interface WireguardConfigParseResult {
  endpoint: string;
  suggestedId: string;
  suggestedLabel: string;
  countryCode?: string;
  flag?: string;
  privateKey?: string;
  address?: string;
  dns?: string;
  publicKey?: string;
  allowedIps?: string;
  persistentKeepalive?: string;
  rawText?: string;
}

export interface AddTunnelPayload {
  id: string;
  label: string;
  endpoint: string;
  provider?: string;
  confContent?: string;
  privateKey?: string;
  address?: string;
  publicKey?: string;
  dns?: string;
}

export interface AppRouteRule {
  id: string; // e.g. "app_crunchyroll" or "app_youtube_tv"
  name: string; // e.g. "Crunchyroll"
  serviceKey?: string; // preset id e.g. "crunchyroll" or "custom"
  tunnel: string; // "direct" | "wgus" | "wges" | etc.
  targetDevice: 'all' | string; // 'all' or device IP (e.g. "192.168.10.163")
  domains: string[];
  enabled: boolean;
}

export interface SslStatus {
  has_openssl: boolean;
  has_stunnel: boolean;
  stunnel_active: boolean;
  has_cert: boolean;
  has_key: boolean;
  has_csr: boolean;
  subject?: string;
  issuer?: string;
  valid_to?: string;
  sans?: string[];
  csr?: string;
  web_port?: number;
  ssl_enabled?: boolean;
}
