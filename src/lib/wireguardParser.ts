import type { WireguardConfigParseResult } from './types';
import { getTunnelFlag, getTunnelCountryCode, countryCodeToFlag } from './locations';

/**
 * Parses standard WireGuard .conf file text
 */
export function parseWireguardConf(
  confText: string,
  fileName: string = ''
): WireguardConfigParseResult {
  const lines = confText.split(/\r?\n/);
  let endpoint = '';
  let privateKey = '';
  let address = '';
  let dns = '';
  let publicKey = '';
  let allowedIps = '0.0.0.0/0';
  let persistentKeepalive = '25';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('#') || !line.includes('=')) continue;

    const [rawKey, ...valueParts] = line.split('=');
    const key = rawKey.trim().toLowerCase();
    const value = valueParts.join('=').trim();

    if (key === 'endpoint') {
      endpoint = value;
    } else if (key === 'privatekey') {
      privateKey = value;
    } else if (key === 'address') {
      address = value;
    } else if (key === 'dns') {
      dns = value;
    } else if (key === 'publickey') {
      publicKey = value;
    } else if (key === 'allowedips') {
      allowedIps = value;
    } else if (key === 'persistentkeepalive') {
      persistentKeepalive = value;
    }
  }

  // Derive suggested ID & label from fileName, comments, or endpoint
  let baseName = fileName.replace(/\.conf$/i, '').trim();
  if (!baseName && endpoint) {
    baseName = endpoint.split(':')[0].replace(/[^a-zA-Z0-9]/g, '_');
  }

  // Detect country code and flag
  const detectedCode = getTunnelCountryCode('', baseName, endpoint) || '';
  const flag = detectedCode ? countryCodeToFlag(detectedCode) : getTunnelFlag('', baseName, endpoint);

  // Suggested interface ID (e.g. wges, wgse, wgus)
  const cleanCode = detectedCode.toLowerCase();
  const suggestedId = cleanCode
    ? `wg${cleanCode}`
    : `wg${baseName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'custom'}`;

  // Suggested Label (e.g. "ES / Madrid" or "SE / Stockholm" or filename)
  let suggestedLabel = baseName || 'Custom Relay';
  if (cleanCode) {
    suggestedLabel = `${cleanCode.toUpperCase()} / Relay`;
    const words = baseName.split(/[-_.\s]+/);
    for (const w of words) {
      const lowerW = w.toLowerCase();
      if (
        w.length > 2 &&
        !['surfshark', 'mullvad', 'nordvpn', 'prod', 'wg', 'wireguard', 'vpn', 'com'].includes(lowerW)
      ) {
        suggestedLabel = `${cleanCode.toUpperCase()} / ${w.charAt(0).toUpperCase() + w.slice(1)}`;
        break;
      }
    }
  }

  return {
    endpoint,
    suggestedId,
    suggestedLabel,
    countryCode: detectedCode || undefined,
    flag,
    privateKey,
    address,
    dns,
    publicKey,
    allowedIps,
    persistentKeepalive,
    rawText: confText,
  };
}
