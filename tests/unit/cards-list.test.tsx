
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CardsList } from '@/app/dashboard/cards/components/cards-list';
import '@testing-library/jest-dom';

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('CardsList Component', () => {
  const mockCards = [
    {
      id: 'card-123',
      last4: '4242',
      brand: 'Visa',
      expMonth: 12,
      expYear: 2025,
      status: 'ACTIVE',
      amount: 1000,
      currency: 'EUR',
      amountUsed: 0,
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('renders Visa logo correctly', () => {
    render(<CardsList initialCards={mockCards} />);
    const visaLogo = screen.getAllByRole('img', { name: /Visa Logo/i })[0];
    expect(visaLogo).toBeInTheDocument();
  });

  it('opens delete confirmation modal when trash icon is clicked', () => {
    render(<CardsList initialCards={mockCards} />);
    
    const deleteButton = screen.getByLabelText('Remover cartão');
    fireEvent.click(deleteButton);

    expect(screen.getByRole('heading', { name: 'Remover Cartão' })).toBeInTheDocument();
    expect(screen.getByText('Tem certeza que deseja remover este cartão? Esta ação não pode ser desfeita.')).toBeInTheDocument();
  });

  it('calls delete API and updates state on successful deletion', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<CardsList initialCards={mockCards} />);

    // Open delete modal
    fireEvent.click(screen.getByLabelText('Remover cartão'));

    // Confirm delete
    const dialog = screen.getByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', { name: 'Remover Cartão' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cards/card-123', {
        method: 'DELETE',
      });
    });

    await waitFor(() => {
        expect(screen.queryByText('•••• •••• •••• 4242')).not.toBeInTheDocument();
    });
  });

  it('shows error toast on deletion failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to delete' }),
    });

    render(<CardsList initialCards={mockCards} />);

    // Open delete modal
    fireEvent.click(screen.getByLabelText('Remover cartão'));

    // Confirm delete
    const dialog = screen.getByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', { name: 'Remover Cartão' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('•••• •••• •••• 4242')).toBeInTheDocument();
    });
  });
});
