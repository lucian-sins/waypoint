/**
 * CIDR and IPv4 utility functions
 */

export function ipToLong(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let res = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = parseInt(part, 10);
    if (n < 0 || n > 255) return null;
    res = (res << 8) + n;
  }
  return res >>> 0;
}

export function isValidCidr(cidr: string): boolean {
  const parts = cidr.trim().split('/');
  if (parts.length !== 2) return false;
  const ip = parts[0];
  const prefixStr = parts[1];
  if (ipToLong(ip) === null) return false;
  if (!/^\d+$/.test(prefixStr)) return false;
  const prefix = parseInt(prefixStr, 10);
  return prefix >= 0 && prefix <= 32;
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  const ipInt = ipToLong(ip);
  if (ipInt === null) return false;

  const parts = cidr.trim().split('/');
  if (parts.length !== 2) return false;

  const networkInt = ipToLong(parts[0]);
  if (networkInt === null) return false;

  const prefix = parseInt(parts[1], 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  if (prefix === 0) return true;
  const mask = ((~0 << (32 - prefix)) >>> 0);
  return (ipInt & mask) === (networkInt & mask);
}

export function isIpInAnyCidr(ip: string, cidrs: string[]): boolean {
  if (!cidrs || cidrs.length === 0) return true;
  return cidrs.some((cidr) => isIpInCidr(ip, cidr));
}
