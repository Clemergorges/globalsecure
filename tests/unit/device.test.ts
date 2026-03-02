import { inferDeviceTypeFromUserAgent } from '@/lib/device';

describe('Device inference', () => {
  test('should infer mobile devices from common user agents', () => {
    expect(inferDeviceTypeFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('Mobile');
    expect(inferDeviceTypeFromUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile')).toBe('Mobile');
  });

  test('should infer desktop devices from common user agents', () => {
    expect(inferDeviceTypeFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Desktop');
    expect(inferDeviceTypeFromUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe('Desktop');
  });

  test('should return Unknown for missing or unrecognized user agents', () => {
    expect(inferDeviceTypeFromUserAgent(null)).toBe('Unknown');
    expect(inferDeviceTypeFromUserAgent('curl/8.0')).toBe('Unknown');
  });
});

