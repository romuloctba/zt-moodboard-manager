/**
 * Device Identification
 * 
 * Generates and manages unique device IDs for sync conflict resolution.
 */

const DEVICE_ID_KEY = 'moodboard-device-id';
const DEVICE_NAME_KEY = 'moodboard-device-name';

/**
 * Get or create a unique device identifier
 * Stored in localStorage for persistence across sessions
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = `device-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Get a human-readable device name based on platform
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') {
    return 'Server';
  }

  // Check for stored custom name first
  const customName = localStorage.getItem(DEVICE_NAME_KEY);
  if (customName) {
    return customName;
  }

  // Detect platform
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';

  // iOS devices
  if (/iPad/.test(ua)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';

  // Android
  if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) return 'Android Phone';
    return 'Android Tablet';
  }

  // Desktop
  if (/Mac/.test(platform)) return 'Mac';
  if (/Win/.test(platform)) return 'Windows PC';
  if (/Linux/.test(platform)) return 'Linux';

  // Chrome OS
  if (/CrOS/.test(ua)) return 'Chromebook';

  return 'Unknown Device';
}

/**
 * Set a custom device name
 */
export function setDeviceName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEVICE_NAME_KEY, name);
}

/**
 * Clear device identity (useful for testing)
 */
export function clearDeviceIdentity(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEVICE_ID_KEY);
  localStorage.removeItem(DEVICE_NAME_KEY);
}
