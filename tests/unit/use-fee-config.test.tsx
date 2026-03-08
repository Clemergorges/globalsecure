/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { __resetFeeConfigCacheForTests, FALLBACK_CONFIG, useFeeConfig } from '@/hooks/useFeeConfig';

function Probe() {
  const s = useFeeConfig();
  return (
    <div>
      <div data-testid="loading">{String(s.loading)}</div>
      <div data-testid="fallback">{String(s.isFallback)}</div>
      <div data-testid="rem">{String(s.data.remittance_fee_percent)}</div>
      <div data-testid="source">{String(s.data.source)}</div>
      <div data-testid="hasError">{String(Boolean(s.error))}</div>
    </div>
  );
}

describe('useFeeConfig', () => {
  beforeEach(() => {
    __resetFeeConfigCacheForTests();
    jest.clearAllMocks();
    (global.fetch as any) = jest.fn();
  });

  test('carrega config da API e não usa fallback', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        remittance_fee_percent: 3.1,
        fx_spread_percent: 1.2,
        yield_apy_percent: 4.2,
        last_updated: new Date().toISOString(),
        source: 'env',
      }),
    });

    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('hasError').textContent).toBe('false');
    expect(screen.getByTestId('fallback').textContent).toBe('false');
    expect(screen.getByTestId('rem').textContent).toBe('3.1');
    expect(screen.getByTestId('source').textContent).toBe('env');
  });

  test('usa fallback quando API falha', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));

    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('hasError').textContent).toBe('true');
    expect(screen.getByTestId('fallback').textContent).toBe('true');
    expect(screen.getByTestId('rem').textContent).toBe(String(FALLBACK_CONFIG.remittance_fee_percent));
    expect(screen.getByTestId('source').textContent).toBe(String(FALLBACK_CONFIG.source));
  });

  test('cache em memória evita fetch duplicado', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        remittance_fee_percent: 2.9,
        fx_spread_percent: 1.1,
        yield_apy_percent: 4.1,
        last_updated: new Date().toISOString(),
        source: 'env',
      }),
    });

    const { unmount } = render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    unmount();

    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

