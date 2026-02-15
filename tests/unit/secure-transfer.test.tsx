
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecureTransferDialog } from '@/app/dashboard/cards/components/secure-transfer-dialog';
import '@testing-library/jest-dom';

// Mocks
const mockOnOpenChange = jest.fn();
const mockOnSuccess = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('SecureTransferDialog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders form when open', () => {
    render(<SecureTransferDialog open={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />);
    
    expect(screen.getByText('Global Link (Transferência Segura)')).toBeInTheDocument();
    expect(screen.getByLabelText('Email do Destinatário')).toBeInTheDocument();
    expect(screen.getByLabelText('Valor')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<SecureTransferDialog open={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />);
    
    const submitButton = screen.getByRole('button', { name: 'Gerar Global Link' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Email e valor são obrigatórios.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits form and shows success view', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        claimUrl: 'http://localhost:3000/claim/token123',
        unlockCode: '123456',
        cardId: 'card_123'
      }),
    });

    render(<SecureTransferDialog open={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText('Email do Destinatário'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '50' } });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Global Link' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/claim-links', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"recipientEmail":"test@example.com"')
      }));
    });

    // Check Success View
    expect(await screen.findByText('Envio Realizado com Sucesso!')).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument(); // Unlock Code
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('handles API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Insufficient funds' }),
    });

    render(<SecureTransferDialog open={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText('Email do Destinatário'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '50000' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Global Link' }));

    expect(await screen.findByText('Insufficient funds')).toBeInTheDocument();
  });
});
