/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextIntlClientProvider } from 'next-intl';

import LoginPage from '@/app/auth/login/page';
import RegisterPage from '@/app/auth/register/page';
import ForgotPasswordPage from '@/app/auth/forgot-password/page';
import ResetPasswordPage from '@/app/auth/reset-password/page';
import VerifyPage from '@/app/verify/page';
import SecuritySettingsPage from '@/app/dashboard/settings/security/page';
import { CardEmailDialog } from '@/app/dashboard/cards/components/card-email-dialog';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => ({
    get: (k: string) => {
      if (k === 'token') return 'tok_test';
      if (k === 'email') return 'test@example.com';
      return null;
    },
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@/hooks/useFeeConfig', () => ({
  useFeeConfigWithOptions: () => ({
    loading: false,
    error: null,
    data: { remittance_fee_percent: 0, source: 'DEFAULT' },
  }),
}));

describe('Autocomplete attributes for credentials and OTP', () => {
  beforeEach(() => {
    (global as any).ResizeObserver =
      (global as any).ResizeObserver ||
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };

    (global as any).fetch = jest.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : String(input?.url || '');
      if (url.includes('/api/security/sessions')) {
        return { ok: true, status: 200, json: async () => ({ sessions: [] }) } as any;
      }
      if (url.includes('/api/user/yield-toggle')) {
        return { ok: true, status: 200, json: async () => ({ yieldEnabled: false }) } as any;
      }
      if (url.includes('/api/auth/me')) {
        return { ok: true, status: 200, json: async () => ({ user: { email: 'u@test.com', twoFactorEnabled: false } }) } as any;
      }
      if (url.includes('/api/security/2fa/enable')) {
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }
      if (url.includes('/api/auth/sensitive/otp/request')) {
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }

      if (url.includes('/api/transfers/create')) {
        return { ok: false, status: 403, json: async () => ({ code: 'SENSITIVE_OTP_REQUIRED', message: 'OTP required' }) } as any;
      }

      return { ok: true, status: 200, json: async () => ({}) } as any;
    });
    (global as any).alert = jest.fn();
    (global as any).confirm = jest.fn(() => true);
  });

  it('sets login username/current-password', () => {
    render(
      <NextIntlClientProvider locale="pt" messages={{} as any}>
        <LoginPage />
      </NextIntlClientProvider>,
    );

    expect(screen.getByLabelText('email')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('password')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('sets register username/new-password', () => {
    render(
      <NextIntlClientProvider locale="pt" messages={{} as any}>
        <RegisterPage />
      </NextIntlClientProvider>,
    );

    expect(screen.getByPlaceholderText('emailPlaceholder')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('sets forgot-password username', () => {
    render(
      <NextIntlClientProvider locale="pt" messages={{} as any}>
        <ForgotPasswordPage />
      </NextIntlClientProvider>,
    );

    expect(screen.getByLabelText('email')).toHaveAttribute('autocomplete', 'username');
  });

  it('sets reset-password new-password for password + confirm', () => {
    render(
      <NextIntlClientProvider locale="pt" messages={{} as any}>
        <ResetPasswordPage />
      </NextIntlClientProvider>,
    );

    expect(screen.getByLabelText('newPassword')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('confirmPassword')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('sets verify code one-time-code', async () => {
    render(
      <NextIntlClientProvider locale="pt" messages={{} as any}>
        <VerifyPage />
      </NextIntlClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('codeLabel')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('codeLabel')).toHaveAttribute('autocomplete', 'one-time-code');
  });

  it('sets security settings current/new password and OTP dialogs one-time-code', async () => {
    render(
      <NextIntlClientProvider locale="pt" messages={{} as any}>
        <SecuritySettingsPage />
      </NextIntlClientProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('input[autocomplete="current-password"]')).toBeInTheDocument();
    });
    expect(document.querySelector('input[autocomplete="new-password"]')).toBeInTheDocument();

    const labelBox = screen.getByText('sms2faLabel').closest('div');
    expect(labelBox).toBeTruthy();
    const twoFaRow = (labelBox as HTMLElement).parentElement;
    expect(twoFaRow).toBeTruthy();
    const switchEl = within(twoFaRow as HTMLElement).getByRole('switch');
    fireEvent.click(switchEl);

    await waitFor(() => {
      expect(screen.getByText('verifySmsCodeTitle')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('000000')).toHaveAttribute('autocomplete', 'one-time-code');

    const current = document.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;
    const next = document.querySelector('input[autocomplete="new-password"]') as HTMLInputElement;
    fireEvent.change(current, { target: { value: 'OldPassword123!' } });
    fireEvent.change(next, { target: { value: 'NewPassword123!' } });
    fireEvent.submit(current.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(screen.getByText('passwordChange.enterOtp')).toBeInTheDocument();
    });
    const otpInDialog = screen.getAllByPlaceholderText('000000').pop();
    expect(otpInDialog).toHaveAttribute('autocomplete', 'one-time-code');
  });

  it('sets CardEmailDialog SCA OTP one-time-code', async () => {
    render(
      <NextIntlClientProvider locale="pt" messages={{} as any}>
        <CardEmailDialog open={true} onOpenChange={jest.fn()} onSuccess={jest.fn()} />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('amount'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('recipientEmail'), { target: { value: 'a@b.com' } });

    fireEvent.click(screen.getByText('send'));

    await waitFor(() => {
      expect(screen.getByText('sca.requestCode')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('sca.requestCode'));

    await waitFor(() => {
      expect(screen.getByLabelText('sca.codeLabel')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('000000')).toHaveAttribute('autocomplete', 'one-time-code');
  });
});
