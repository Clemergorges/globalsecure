import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Vercel / Cloudflare headers
  const country = req.headers.get('x-vercel-ip-country') || 
                  req.headers.get('cf-ipcountry') || 
                  'BR'; // Default fallback

  const currencyMap: Record<string, string> = {
    'BR': 'BRL',
    'US': 'USD',
    'GB': 'GBP',
    // Eurozone
    'LU': 'EUR', 'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'PT': 'EUR', 
    'IT': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'IE': 'EUR'
  };

  const currency = currencyMap[country] || 'USD';

  return NextResponse.json({ country, currency });
}