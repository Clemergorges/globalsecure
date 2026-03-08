/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import TravelModeToggle from '@/components/settings/TravelModeToggle';
import { TravelModeHeaderIcon } from '@/components/dashboard/TravelModeHeaderIcon';
import { OperationalBanners } from '@/components/incident/OperationalBanners';
import '@testing-library/jest-dom';

describe('Travel Mode UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as any) = jest.fn();
  });

  test('não renderiza toggle sem flag', () => {
    process.env.NEXT_PUBLIC_TRAVEL_MODE_ENABLED = 'false';
    const { container } = render(<TravelModeToggle />);
    expect(container.firstChild).toBeNull();
  });

  test('renderiza e chama POST corretamente', async () => {
    process.env.NEXT_PUBLIC_TRAVEL_MODE_ENABLED = 'true';

    (global.fetch as jest.Mock).mockImplementation((url: string, init?: any) => {
      if (url === '/api/user/travel-mode' && (!init || init.method === 'GET')) {
        return Promise.resolve({ ok: true, json: async () => ({ travelModeEnabled: false, travelRegion: null }) });
      }
      if (url === '/api/geo') {
        return Promise.resolve({ ok: true, json: async () => ({ country: 'US', currency: 'USD' }) });
      }
      if (url === '/api/user/travel-mode' && init?.method === 'POST') {
        const body = JSON.parse(init.body);
        expect(body.enabled).toBe(true);
        expect(body.countryCode).toBe('US');
        return Promise.resolve({ ok: true, json: async () => ({ travelModeEnabled: true, travelRegion: 'US' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ ok: true, flags: {} }) });
    });

    render(<TravelModeToggle />);

    const toggle = await screen.findByRole('switch', { name: 'toggleLabel' });
    await waitFor(() => expect(toggle).not.toBeDisabled());
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/travel-mode', expect.objectContaining({ method: 'POST' }));
    });
  });

  test('ícone do header aparece quando ativo', async () => {
    process.env.NEXT_PUBLIC_TRAVEL_MODE_ENABLED = 'true';
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ travelModeEnabled: true, travelRegion: 'BR' }) });
    render(<TravelModeHeaderIcon />);
    expect(await screen.findByText('active')).toBeInTheDocument();
  });

  test('banner aparece quando ativo e flags ok', async () => {
    process.env.NEXT_PUBLIC_TRAVEL_MODE_ENABLED = 'true';
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/ops/flags') return Promise.resolve({ ok: true, json: async () => ({ ok: true, flags: { TREASURY_HALT_DEPOSITS_WITHDRAWS: false, YIELD_ALLOCATIONS_PAUSED: false, PARTNER_OUTAGE: false } }) });
      if (url === '/api/user/travel-mode') return Promise.resolve({ ok: true, json: async () => ({ travelModeEnabled: true, travelRegion: 'BR' }) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<OperationalBanners />);
    expect(await screen.findByText('travelMode.bannerTitle')).toBeInTheDocument();
  });
});
