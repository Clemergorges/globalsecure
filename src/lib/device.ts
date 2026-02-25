export type DeviceType = 'Mobile' | 'Desktop' | 'Unknown';

export function inferDeviceTypeFromUserAgent(userAgent: string | null): DeviceType {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('android') || ua.includes('mobile')) return 'Mobile';
  if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) return 'Desktop';
  return 'Unknown';
}

