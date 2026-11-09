import type { Device } from './types';

export interface MacVendorInfo {
  vendor: string | null;
  isRandomized: boolean;
  category?: Device['icon'];
  suggestions?: string[];
}

/**
 * Checks if a MAC address is a locally administered (private/randomized) address.
 * Modern iOS, Android, Windows, and macOS use private addresses with the U/L bit set to 1.
 * Hex digits 2, 6, A, E in the second character of the first octet.
 */
export function isRandomizedMac(mac: string): boolean {
  if (!mac || typeof mac !== 'string') return false;
  const clean = mac.replace(/[^a-fA-F0-9]/g, '');
  if (clean.length < 2) return false;
  const secondNibble = parseInt(clean[1], 16);
  // Bit 1 of first byte (2nd least significant bit) is 1 for locally administered addresses
  return (secondNibble & 0x2) !== 0;
}

interface OuiRecord {
  vendor: string;
  category?: Device['icon'];
  suggestions?: string[];
}

// In-memory cache for dynamic or discovered vendors
const vendorCache = new Map<string, MacVendorInfo>();

// Curated high-performance OUI prefix map (normalized 6-char hex lowercased)
const OUI_DATABASE: Record<string, OuiRecord> = {
  // Amazon Technologies (Echo, Fire TV, Kindle, Ring, Blink)
  '38f73d': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV', 'Kindle'] },
  '90a822': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV', 'Echo Dot'] },
  '44650d': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Fire TV Stick', 'Amazon Echo'] },
  '6837e9': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  'fc65de': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  '74c246': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  'cc9e00': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  'ac63be': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  '50dce7': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  '00fc8b': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  '244caf': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  '40b4cd': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  '68545a': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  '84d6d0': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  'a002dc': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  'b47c9c': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  'd052a8': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  'fc58fa': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  '18742e': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  '4c1744': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  '78e103': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },
  '34d270': { vendor: 'Amazon Technologies Inc.', category: 'tv', suggestions: ['Amazon Echo', 'Fire TV'] },

  // Tuya Smart (Smart Plugs, Bulbs, Relays, lwip devices)
  'bc351e': { vendor: 'Tuya Smart Inc.', category: 'iot', suggestions: ['Tuya Smart Plug', 'Smart Bulb', 'Smart Switch'] },
  '708976': { vendor: 'Tuya Smart Inc.', category: 'iot', suggestions: ['Tuya Smart Plug', 'Smart Bulb', 'Smart Switch'] },
  '105a17': { vendor: 'Tuya Smart Inc.', category: 'iot', suggestions: ['Tuya Smart Plug', 'Smart Bulb', 'Smart Switch'] },
  'd8bfc0': { vendor: 'Tuya Smart Inc.', category: 'iot', suggestions: ['Tuya Smart Plug', 'Smart Bulb', 'Smart Switch'] },
  '84f3eb': { vendor: 'Tuya Smart Inc.', category: 'iot', suggestions: ['Tuya Smart Plug', 'Smart Bulb', 'Smart Switch'] },
  'd4d4da': { vendor: 'Tuya Smart Inc.', category: 'iot', suggestions: ['Tuya Smart Plug', 'Smart Bulb', 'Smart Switch'] },
  '68572e': { vendor: 'Tuya Smart Inc.', category: 'iot', suggestions: ['Tuya Smart Plug', 'Smart Bulb', 'Smart Switch'] },
  '508a06': { vendor: 'Tuya Smart Inc.', category: 'iot', suggestions: ['Tuya Smart Plug', 'Smart Bulb', 'Smart Switch'] },
  '2c3ae8': { vendor: 'Tuya Smart Inc.', category: 'iot', suggestions: ['Tuya Smart Plug', 'Smart Bulb', 'Smart Switch'] },
  '1869d8': { vendor: 'Tuya Smart Inc.', category: 'iot', suggestions: ['Tuya Smart Plug', 'Smart Bulb', 'Smart Switch'] },
  '403f8c': { vendor: 'Tuya Smart Inc.', category: 'iot', suggestions: ['Tuya Smart Plug', 'Smart Bulb', 'Smart Switch'] },

  // Canon (Printers / Multifunction)
  '5003cf': { vendor: 'Canon Inc.', category: 'iot', suggestions: ['Canon Printer', 'PIXMA Printer', 'Canon Scanner'] },
  '000085': { vendor: 'Canon Inc.', category: 'iot', suggestions: ['Canon Printer', 'Canon Scanner'] },
  '001e8f': { vendor: 'Canon Inc.', category: 'iot', suggestions: ['Canon Printer', 'Canon Scanner'] },
  '180cac': { vendor: 'Canon Inc.', category: 'iot', suggestions: ['Canon Printer', 'Canon Scanner'] },
  '888717': { vendor: 'Canon Inc.', category: 'iot', suggestions: ['Canon Printer', 'Canon Scanner'] },
  'c48e8f': { vendor: 'Canon Inc.', category: 'iot', suggestions: ['Canon Printer', 'Canon Scanner'] },
  '1402ec': { vendor: 'Canon Inc.', category: 'iot', suggestions: ['Canon Printer', 'Canon Scanner'] },
  '70b3d5': { vendor: 'Canon Inc.', category: 'iot', suggestions: ['Canon Printer', 'Canon Scanner'] },
  'ec8914': { vendor: 'Canon Inc.', category: 'iot', suggestions: ['Canon Printer', 'Canon Scanner'] },

  // Intel Corporate (Wi-Fi Cards, Laptops, PCs, NUCs)
  '50e085': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop', 'Desktop PC'] },
  'd4ab61': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop', 'Desktop PC'] },
  '001302': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '001b21': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '8c8d28': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '34e6ad': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '4851c5': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '9cb6d0': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  'a44c88': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '001500': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '0016ea': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '0019d1': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '00215c': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '0024d7': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '081196': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '3c5282': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '401a58': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '60f673': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '780cb8': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '8086f2': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  '843a4b': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  'a0afbd': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  'b49691': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  'c809a8': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },
  'f894c2': { vendor: 'Intel Corporate', category: 'laptop', suggestions: ['Intel PC', 'Windows Laptop'] },

  // Sonos (Speakers, Amps, Soundbars)
  'f0f6c1': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos One', 'Sonos Arc', 'Sonos Beam'] },
  '000e58': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos Sub', 'Sonos Amp'] },
  'b8e937': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos One'] },
  '48a6b8': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos Roam'] },
  '5caafd': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos Move'] },
  '7828ca': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos Era'] },
  '949f3e': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos Beam'] },
  '001e3b': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos Play:1'] },
  '347e5c': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos Play:5'] },
  '542a1b': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos One'] },
  '7c6166': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos Move'] },
  '803896': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos Port'] },
  '90e7c4': { vendor: 'Sonos, Inc.', category: 'tv', suggestions: ['Sonos Speaker', 'Sonos Five'] },

  // LIFX / LiFi Labs
  'd073d5': { vendor: 'LIFX (LiFi Labs)', category: 'iot', suggestions: ['LIFX Smart Bulb', 'LIFX Lightstrip', 'LIFX Beam'] },

  // Apple, Inc. (iPhone, iPad, Mac, Apple TV, Apple Watch, HomePod)
  'bc9f58': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'MacBook', 'iPad', 'Apple Watch'] },
  'acde48': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'iMac', 'Mac mini'] },
  '0017f2': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Mac mini'] },
  'f01898': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '3c22fb': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'a4c361': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad', 'MacBook'] },
  'f8ffc2': { vendor: 'Apple, Inc.', category: 'tv', suggestions: ['Apple TV', 'HomePod'] },
  '000393': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '000a27': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '000a95': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '000d93': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '0010fa': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '001451': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '0016cb': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '0019e3': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '001b63': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '001e52': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '0021e9': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '002312': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '0023df': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '002500': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '00254b': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '002608': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '00264a': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '0026b0': { vendor: 'Apple, Inc.', category: 'laptop', suggestions: ['MacBook', 'Apple Device'] },
  '040cce': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '041552': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '042665': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '045453': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '04e536': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '087045': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '08e689': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '0c1539': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '0c4de9': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '109add': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '14109f': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '18af61': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '18e728': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '1c1ac0': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '20768f': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '24a2e1': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '280b5c': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '286aba': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '2cbe08': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '3035ad': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '3408bc': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '38ca84': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '3c0754': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '406c8f': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '44fb42': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '4860bc': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '4cb1cd': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '50ea96': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '542696': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '5855ca': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '5c969d': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '600308': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '64b0a6': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '680927': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '6c4008': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '701124': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '748114': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '787e61': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '7ca1ae': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '804971': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '848506': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '88665a': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '8c8590': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '9027e4': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '941625': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '9801a7': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  '9c207b': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'a01828': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'a45e60': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'a860b6': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'acbc32': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'b065bd': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'b418d1': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'b8782e': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'bc6778': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'c0847d': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'c42c03': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'c869cd': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'cc088d': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'd023db': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'd4619d': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'd8004d': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'dc3714': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'e0accb': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'e498d6': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'e8040b': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'ec3586': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'f099bf': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'f40f24': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'f82793': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },
  'fc183c': { vendor: 'Apple, Inc.', category: 'phone', suggestions: ['iPhone', 'iPad'] },

  // Samsung Electronics (Smart TVs, Galaxy, Tizen, Home Appliances)
  '6c70cb': { vendor: 'Samsung Electronics', category: 'tv', suggestions: ['Samsung Smart TV', 'Samsung TV', 'Samsung Tizen'] },
  '0007ab': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '001247': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '183f47': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '2827bf': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '508569': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'a00bba': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'c4731e': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'e47cf9': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '001599': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '0017c9': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '001a8a': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '002119': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '0023d6': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '0024e9': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '00265d': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '041b6d': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '08373d': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '0cf19e': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '101cee': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '1489fd': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '1c5a3e': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '205531': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '244bfe': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '2cb21a': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '30cd70': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '3438b7': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '380146': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '40163b': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '4480eb': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '4859a4': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '4c3c16': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '5056a8': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '5492be': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '582a47': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '5c3a3b': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '60af6d': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '64b853': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '68ebae': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '6c8336': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '70288b': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '7445ce': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '784b87': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '7c38ad': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '805b65': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '8425db': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '88329b': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '8c7712': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '90f1aa': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '94350a': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '980ca2': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  '9c3a35': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'a470d6': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'a89fba': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'ac3613': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'b0c554': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'b479a7': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'b85a73': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'bc20a4': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'c09727': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'c81479': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'cc07ab': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'd022be': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'd4e6b7': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'd857ef': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'dc7144': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'e4e0c5': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'e8e5d6': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'ec1127': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'f02572': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'f40270': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'f88f63': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },
  'fcf136': { vendor: 'Samsung Electronics', category: 'phone', suggestions: ['Samsung Galaxy', 'Samsung Smart TV'] },

  // Google / Nest
  'a47733': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast', 'Pixel Phone'] },
  'f4f5e8': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Google Home', 'Chromecast'] },
  'd86c63': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Google Home', 'Chromecast'] },
  '546009': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Google Home'] },
  '48d6d5': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Google Home'] },
  'e4f042': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Google Home'] },
  '3c5a37': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Google Home'] },
  '089e08': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Google Home'] },
  '001a11': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast'] },
  '3ce90e': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast'] },
  '404e36': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast'] },
  '44070b': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast'] },
  '70ee50': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast'] },
  '94ebcd': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast'] },
  'a4c494': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast'] },
  'ac3743': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast'] },
  'd4f547': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast'] },
  'e076d0': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast'] },
  'f80f41': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast'] },
  'f88fca': { vendor: 'Google LLC (Nest)', category: 'iot', suggestions: ['Google Nest Hub', 'Chromecast'] },

  // Philips Hue (Signify)
  'ecb5fa': { vendor: 'Philips Hue (Signify)', category: 'iot', suggestions: ['Philips Hue Bridge', 'Hue Smart Light'] },
  '001788': { vendor: 'Philips Hue (Signify)', category: 'iot', suggestions: ['Philips Hue Bridge', 'Hue Smart Light'] },
  'b0ce18': { vendor: 'Philips Hue (Signify)', category: 'iot', suggestions: ['Philips Hue Bridge', 'Hue Smart Light'] },
  '446755': { vendor: 'Philips Hue (Signify)', category: 'iot', suggestions: ['Philips Hue Bridge', 'Hue Smart Light'] },
  '1c599b': { vendor: 'Philips Hue (Signify)', category: 'iot', suggestions: ['Philips Hue Bridge', 'Hue Smart Light'] },

  // Espressif (DIY IoT, ESP32, ESP8266, Tasmota, WLED)
  '246f28': { vendor: 'Espressif Inc.', category: 'iot', suggestions: ['ESP32 Smart Device', 'ESP8266 Device', 'Smart Home IoT'] },
  '30aea4': { vendor: 'Espressif Inc.', category: 'iot', suggestions: ['ESP32 Smart Device', 'ESP8266 Device', 'Smart Home IoT'] },
  'dc4f22': { vendor: 'Espressif Inc.', category: 'iot', suggestions: ['ESP32 Smart Device', 'ESP8266 Device', 'Smart Home IoT'] },
  'a020a6': { vendor: 'Espressif Inc.', category: 'iot', suggestions: ['ESP32 Smart Device', 'ESP8266 Device', 'Smart Home IoT'] },
  'e868e7': { vendor: 'Espressif Inc.', category: 'iot', suggestions: ['ESP32 Smart Device', 'ESP8266 Device', 'Smart Home IoT'] },
  'c82e18': { vendor: 'Espressif Inc.', category: 'iot', suggestions: ['ESP32 Smart Device', 'ESP8266 Device', 'Smart Home IoT'] },
  '485519': { vendor: 'Espressif Inc.', category: 'iot', suggestions: ['ESP32 Smart Device', 'ESP8266 Device', 'Smart Home IoT'] },
  '7cdfa1': { vendor: 'Espressif Inc.', category: 'iot', suggestions: ['ESP32 Smart Device', 'ESP8266 Device', 'Smart Home IoT'] },
  '807d3a': { vendor: 'Espressif Inc.', category: 'iot', suggestions: ['ESP32 Smart Device', 'ESP8266 Device', 'Smart Home IoT'] },

  // TP-Link
  '50d4f7': { vendor: 'TP-Link Technologies', category: 'iot', suggestions: ['TP-Link Kasa Plug', 'Tapo Device', 'Wi-Fi Extender'] },
  '003192': { vendor: 'TP-Link Technologies', category: 'iot', suggestions: ['TP-Link Kasa Plug', 'Tapo Device', 'Wi-Fi Extender'] },
  '14cc20': { vendor: 'TP-Link Technologies', category: 'iot', suggestions: ['TP-Link Kasa Plug', 'Tapo Device', 'Wi-Fi Extender'] },
  '54af97': { vendor: 'TP-Link Technologies', category: 'iot', suggestions: ['TP-Link Kasa Plug', 'Tapo Device', 'Wi-Fi Extender'] },
  '704f57': { vendor: 'TP-Link Technologies', category: 'iot', suggestions: ['TP-Link Kasa Plug', 'Tapo Device', 'Wi-Fi Extender'] },
  '98dac4': { vendor: 'TP-Link Technologies', category: 'iot', suggestions: ['TP-Link Kasa Plug', 'Tapo Device', 'Wi-Fi Extender'] },
  'c006c3': { vendor: 'TP-Link Technologies', category: 'iot', suggestions: ['TP-Link Kasa Plug', 'Tapo Device', 'Wi-Fi Extender'] },
  'e4c32a': { vendor: 'TP-Link Technologies', category: 'iot', suggestions: ['TP-Link Kasa Plug', 'Tapo Device', 'Wi-Fi Extender'] },
  '50c7bf': { vendor: 'TP-Link Technologies', category: 'iot', suggestions: ['TP-Link Kasa Plug', 'Tapo Device', 'Wi-Fi Extender'] },

  // Sony (PlayStation / Bravia)
  '00041f': { vendor: 'Sony Interactive Entertainment', category: 'tv', suggestions: ['PlayStation 5', 'PlayStation 4', 'Sony Bravia TV'] },
  'f8461c': { vendor: 'Sony Interactive Entertainment', category: 'tv', suggestions: ['PlayStation 5', 'PlayStation 4'] },
  '0015c1': { vendor: 'Sony Interactive Entertainment', category: 'tv', suggestions: ['PlayStation 5', 'PlayStation 4'] },
  '709e29': { vendor: 'Sony Interactive Entertainment', category: 'tv', suggestions: ['PlayStation 5', 'PlayStation 4'] },
  'a8e3ee': { vendor: 'Sony Interactive Entertainment', category: 'tv', suggestions: ['PlayStation 5', 'PlayStation 4'] },
  'fc0fe6': { vendor: 'Sony Interactive Entertainment', category: 'tv', suggestions: ['PlayStation 5', 'PlayStation 4'] },

  // Nintendo
  '0009bf': { vendor: 'Nintendo Co., Ltd.', category: 'tv', suggestions: ['Nintendo Switch', 'Nintendo Console'] },
  '98b6e9': { vendor: 'Nintendo Co., Ltd.', category: 'tv', suggestions: ['Nintendo Switch', 'Nintendo Console'] },
  '001f32': { vendor: 'Nintendo Co., Ltd.', category: 'tv', suggestions: ['Nintendo Switch', 'Nintendo Console'] },
  '34af2c': { vendor: 'Nintendo Co., Ltd.', category: 'tv', suggestions: ['Nintendo Switch', 'Nintendo Console'] },
  '7cbb8a': { vendor: 'Nintendo Co., Ltd.', category: 'tv', suggestions: ['Nintendo Switch', 'Nintendo Console'] },
  '8ccde8': { vendor: 'Nintendo Co., Ltd.', category: 'tv', suggestions: ['Nintendo Switch', 'Nintendo Console'] },

  // Microsoft (Xbox)
  '00155d': { vendor: 'Microsoft Corporation', category: 'tv', suggestions: ['Xbox Series X', 'Xbox One', 'Surface Laptop'] },
  '281878': { vendor: 'Microsoft Corporation', category: 'tv', suggestions: ['Xbox Series X', 'Xbox One'] },
  '6045bd': { vendor: 'Microsoft Corporation', category: 'tv', suggestions: ['Xbox Series X', 'Xbox One'] },
  '7c1e52': { vendor: 'Microsoft Corporation', category: 'tv', suggestions: ['Xbox Series X', 'Xbox One'] },
  'dcb4c4': { vendor: 'Microsoft Corporation', category: 'tv', suggestions: ['Xbox Series X', 'Xbox One'] },

  // Roku
  '080581': { vendor: 'Roku, Inc.', category: 'tv', suggestions: ['Roku Streaming Stick', 'Roku TV'] },
  'b0ee45': { vendor: 'Roku, Inc.', category: 'tv', suggestions: ['Roku Streaming Stick', 'Roku TV'] },
  'd83134': { vendor: 'Roku, Inc.', category: 'tv', suggestions: ['Roku Streaming Stick', 'Roku TV'] },
  'dc3a5e': { vendor: 'Roku, Inc.', category: 'tv', suggestions: ['Roku Streaming Stick', 'Roku TV'] },
  'cc6d0a': { vendor: 'Roku, Inc.', category: 'tv', suggestions: ['Roku Streaming Stick', 'Roku TV'] },

  // LG Electronics
  '001c62': { vendor: 'LG Electronics', category: 'tv', suggestions: ['LG webOS TV', 'LG ThinQ Appliance'] },
  '203d66': { vendor: 'LG Electronics', category: 'tv', suggestions: ['LG webOS TV', 'LG ThinQ Appliance'] },
  'a823fe': { vendor: 'LG Electronics', category: 'tv', suggestions: ['LG webOS TV', 'LG ThinQ Appliance'] },
  'cc2d8c': { vendor: 'LG Electronics', category: 'tv', suggestions: ['LG webOS TV', 'LG ThinQ Appliance'] },
  'e85b5b': { vendor: 'LG Electronics', category: 'tv', suggestions: ['LG webOS TV', 'LG ThinQ Appliance'] },

  // Xiaomi / Aqara
  '286c07': { vendor: 'Xiaomi Communications', category: 'iot', suggestions: ['Xiaomi Smart Device', 'Roborock Vacuum', 'Xiaomi Phone'] },
  '64cc2e': { vendor: 'Xiaomi Communications', category: 'iot', suggestions: ['Xiaomi Smart Device', 'Roborock Vacuum', 'Xiaomi Phone'] },
  '7c49eb': { vendor: 'Xiaomi Communications', category: 'iot', suggestions: ['Xiaomi Smart Device', 'Roborock Vacuum', 'Xiaomi Phone'] },
  '04cf8c': { vendor: 'Xiaomi Communications', category: 'iot', suggestions: ['Xiaomi Smart Device', 'Roborock Vacuum'] },
  '34ce00': { vendor: 'Xiaomi Communications', category: 'iot', suggestions: ['Xiaomi Smart Device', 'Roborock Vacuum'] },
  '50642b': { vendor: 'Xiaomi Communications', category: 'iot', suggestions: ['Xiaomi Smart Device', 'Roborock Vacuum'] },

  // Raspberry Pi
  'b827eb': { vendor: 'Raspberry Pi Foundation', category: 'iot', suggestions: ['Raspberry Pi', 'Pi-hole', 'Home Assistant'] },
  'dca632': { vendor: 'Raspberry Pi Foundation', category: 'iot', suggestions: ['Raspberry Pi 4', 'Pi-hole'] },
  'e45f01': { vendor: 'Raspberry Pi Foundation', category: 'iot', suggestions: ['Raspberry Pi 4', 'Pi-hole'] },
  '28cdc1': { vendor: 'Raspberry Pi Foundation', category: 'iot', suggestions: ['Raspberry Pi 5', 'Pi-hole'] },
  'd83add': { vendor: 'Raspberry Pi Foundation', category: 'iot', suggestions: ['Raspberry Pi', 'Pi-hole'] },

  // HP
  '0001e6': { vendor: 'HP Inc.', category: 'iot', suggestions: ['HP Printer', 'HP Laptop'] },
  '10604b': { vendor: 'HP Inc.', category: 'iot', suggestions: ['HP Printer', 'HP Laptop'] },
  '3cd92b': { vendor: 'HP Inc.', category: 'iot', suggestions: ['HP Printer', 'HP Laptop'] },
  '705a0f': { vendor: 'HP Inc.', category: 'iot', suggestions: ['HP Printer', 'HP Laptop'] },
  '9457a5': { vendor: 'HP Inc.', category: 'iot', suggestions: ['HP Printer', 'HP Laptop'] },

  // Dell
  '001422': { vendor: 'Dell Inc.', category: 'laptop', suggestions: ['Dell Laptop', 'Dell Desktop PC'] },
  '180373': { vendor: 'Dell Inc.', category: 'laptop', suggestions: ['Dell Laptop', 'Dell Desktop PC'] },
  '3417eb': { vendor: 'Dell Inc.', category: 'laptop', suggestions: ['Dell Laptop', 'Dell Desktop PC'] },
  '4c79ba': { vendor: 'Dell Inc.', category: 'laptop', suggestions: ['Dell Laptop', 'Dell Desktop PC'] },
  '74867a': { vendor: 'Dell Inc.', category: 'laptop', suggestions: ['Dell Laptop', 'Dell Desktop PC'] },
  'bc305b': { vendor: 'Dell Inc.', category: 'laptop', suggestions: ['Dell Laptop', 'Dell Desktop PC'] },

  // Ubiquiti Networks
  '002722': { vendor: 'Ubiquiti Networks', category: 'iot', suggestions: ['UniFi AP', 'UniFi Switch', 'UniFi Gateway'] },
  '24a43c': { vendor: 'Ubiquiti Networks', category: 'iot', suggestions: ['UniFi AP', 'UniFi Switch'] },
  '68d79a': { vendor: 'Ubiquiti Networks', category: 'iot', suggestions: ['UniFi AP', 'UniFi Switch'] },
  '788a20': { vendor: 'Ubiquiti Networks', category: 'iot', suggestions: ['UniFi AP', 'UniFi Switch'] },
  'b4fbe4': { vendor: 'Ubiquiti Networks', category: 'iot', suggestions: ['UniFi AP', 'UniFi Switch'] },
  'dc9fdb': { vendor: 'Ubiquiti Networks', category: 'iot', suggestions: ['UniFi AP', 'UniFi Switch'] },
  'f09fc2': { vendor: 'Ubiquiti Networks', category: 'iot', suggestions: ['UniFi AP', 'UniFi Switch'] },

  // Synology
  '001132': { vendor: 'Synology Inc.', category: 'iot', suggestions: ['Synology NAS', 'DiskStation'] },
  'a85e45': { vendor: 'Synology Inc.', category: 'iot', suggestions: ['Synology NAS', 'DiskStation'] },

  // Shelly (Allterco)
  'ec64c9': { vendor: 'Shelly (Allterco)', category: 'iot', suggestions: ['Shelly Relay', 'Shelly Smart Plug'] },
  '349454': { vendor: 'Shelly (Allterco)', category: 'iot', suggestions: ['Shelly Relay', 'Shelly Smart Plug'] },

  // TCL Smart TVs
  '488a50': { vendor: 'TCL Smart TV', category: 'tv', suggestions: ['TCL Roku TV', 'TCL Google TV'] },
  '609590': { vendor: 'TCL Smart TV', category: 'tv', suggestions: ['TCL Roku TV', 'TCL Google TV'] },
  'ec7f09': { vendor: 'TCL Smart TV', category: 'tv', suggestions: ['TCL Roku TV', 'TCL Google TV'] },
  '60d819': { vendor: 'TCL Smart TV', category: 'tv', suggestions: ['TCL Roku TV', 'TCL Google TV'] },
  '344b50': { vendor: 'TCL Smart TV', category: 'tv', suggestions: ['TCL Roku TV', 'TCL Google TV'] },

  // Hisense Smart TVs
  '044ef1': { vendor: 'Hisense Smart TV', category: 'tv', suggestions: ['Hisense Smart TV', 'Hisense Roku TV'] },
  '54589d': { vendor: 'Hisense Smart TV', category: 'tv', suggestions: ['Hisense Smart TV', 'Hisense Roku TV'] },
  '84b8b8': { vendor: 'Hisense Smart TV', category: 'tv', suggestions: ['Hisense Smart TV', 'Hisense Roku TV'] },
  'c83a35': { vendor: 'Hisense Smart TV', category: 'tv', suggestions: ['Hisense Smart TV', 'Hisense Roku TV'] },

  // Vizio Smart TVs
  '00133c': { vendor: 'Vizio, Inc.', category: 'tv', suggestions: ['Vizio Smart TV', 'Vizio SmartCast'] },
  '001b9e': { vendor: 'Vizio, Inc.', category: 'tv', suggestions: ['Vizio Smart TV', 'Vizio SmartCast'] },
  '4c7c5f': { vendor: 'Vizio, Inc.', category: 'tv', suggestions: ['Vizio Smart TV', 'Vizio SmartCast'] },
  '64c667': { vendor: 'Vizio, Inc.', category: 'tv', suggestions: ['Vizio Smart TV', 'Vizio SmartCast'] },
};

/**
 * Resolves MAC address vendor info, identifying IEEE OUIs or Private/Randomized MACs (synchronous)
 */
export function getMacVendorInfo(mac: string): MacVendorInfo {
  if (!mac || typeof mac !== 'string') {
    return { vendor: null, isRandomized: false };
  }

  const clean = mac.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  if (clean.length < 6) {
    return { vendor: null, isRandomized: false };
  }

  // Check in-memory / disk cache
  if (vendorCache.has(clean)) {
    return vendorCache.get(clean)!;
  }

  // Check for Locally Administered (Randomized) MAC
  const isRandom = isRandomizedMac(mac);
  if (isRandom) {
    const result: MacVendorInfo = {
      vendor: 'Private / Randomized MAC',
      isRandomized: true,
      category: 'phone',
      suggestions: ['iPhone / iPad', 'Android Phone', 'Laptop (Private MAC)'],
    };
    vendorCache.set(clean, result);
    return result;
  }

  // Check OUI prefix (first 6 hex chars)
  const oui = clean.substring(0, 6);
  const record = OUI_DATABASE[oui];
  if (record) {
    const result: MacVendorInfo = {
      vendor: record.vendor,
      isRandomized: false,
      category: record.category,
      suggestions: record.suggestions,
    };
    vendorCache.set(clean, result);
    return result;
  }

  return {
    vendor: null,
    isRandomized: false,
  };
}

/**
 * Detects if a device has no custom or informative hostname (e.g. Device-192.168.10.x, lwip0, etc.)
 */
export function isUnnamedDevice(device: Device): boolean {
  if (!device || !device.name) return true;
  const n = device.name.trim();
  const lower = n.toLowerCase();
  return (
    n.startsWith('Device-') ||
    n === device.ip ||
    lower === 'lwip0' ||
    lower === 'statichost' ||
    n === '*' ||
    lower === 'unknown'
  );
}

/**
 * Returns suggested friendly names for a device based on its MAC vendor
 */
export function getDeviceSuggestions(device: Device): string[] {
  const info = getMacVendorInfo(device.mac);
  if (info.suggestions && info.suggestions.length > 0) {
    return info.suggestions;
  }
  if (device.vendor && device.vendor !== 'Private / Randomized MAC') {
    const shortVendor = device.vendor.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
    return [`${shortVendor} Device`, `${shortVendor} Client`];
  }
  return ['Smart Device', 'Home Device'];
}
