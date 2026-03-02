/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CardEmailViewPage from '@/app/card/[token]/page';
import { NextIntlClientProvider } from 'next-intl';

jest.mock('next/navigation', () => ({
  useParams: () => ({ token: 'tok_test' }),
}));

describe('Public /card/[token] page', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('renders balances and transactions when API responds OK', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        cardMasked: { last4: '4242', brand: 'visa', expMonth: 12, expYear: 2030 },
        amountInitial: 98.2,
        currency: 'EUR',
        amountUsed: 15.5,
        amountAvailable: 82.7,
        transactions: [
          { merchant: 'Coffee Shop', amount: 10, currency: 'EUR', date: new Date().toISOString() },
          { merchant: 'Book Store', amount: 5.5, currency: 'EUR', date: new Date().toISOString() },
        ],
      }),
    });

    render(
      <NextIntlClientProvider locale="pt" messages={{} as any}>
        <CardEmailViewPage />
      </NextIntlClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Saldo inicial')).toBeInTheDocument();
    });
    expect(screen.getByText('Saldo disponível')).toBeInTheDocument();
    expect(screen.getByText('Coffee Shop')).toBeInTheDocument();
    expect(screen.getByText('Book Store')).toBeInTheDocument();
  });

  it('shows invalid/expired error when API returns CARD_LINK_INVALID', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ ok: false, code: 'CARD_LINK_INVALID' }),
    });

    render(
      <NextIntlClientProvider locale="pt" messages={{} as any}>
        <CardEmailViewPage />
      </NextIntlClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Link inválido ou expirado.')).toBeInTheDocument();
    });
  });
});
