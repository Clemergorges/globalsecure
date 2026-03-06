
import twilio from 'twilio';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

function lastDigits(phoneNumber: string, len: number) {
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.slice(-len);
}

function twilioClient() {
  return twilio(env.twilioAccountSid(), env.twilioAuthToken());
}

export const smsService = {
  async sendOTP(phoneNumber: string, code: string) {
    const provider = env.smsProvider();
    const phoneLast4 = lastDigits(phoneNumber, 4);

    if (!provider) {
      logger.info({ phoneLast4 }, 'sms.send_otp.requested');
      await new Promise((resolve) => setTimeout(resolve, 200));
      return true;
    }

    if (provider !== 'messaging') {
      logger.info({ provider, phoneLast4 }, 'sms.send_otp.requested');
      await new Promise((resolve) => setTimeout(resolve, 200));
      return true;
    }

    if (!env.twilioAccountSid() || !env.twilioAuthToken()) {
      throw new Error('Twilio not configured: missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
    }

    const messagingServiceSid = env.twilioMessagingServiceSid();
    const from = env.twilioFromNumber();

    if (!messagingServiceSid && !from) {
      throw new Error('Twilio not configured for messaging: missing TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER/TWILIO_PHONE_NUMBER');
    }

    try {
      const body = `Seu código de verificação é: ${code}`;
      const message = await twilioClient().messages.create(
        messagingServiceSid ? { to: phoneNumber, messagingServiceSid, body } : { to: phoneNumber, from, body },
      );

      logger.info(
        {
          provider,
          phoneLast4,
          sid: message.sid,
          status: message.status ?? null,
          errorCode: (message as any).errorCode ?? null,
          numSegments: (message as any).numSegments ?? null,
        },
        'sms.send_otp.twilio_messaging',
      );
      return true;
    } catch (err) {
      const anyErr = err && typeof err === 'object' ? (err as any) : null;
      logger.error(
        {
          provider,
          phoneLast4,
          twilio: anyErr
            ? {
                name: anyErr?.name ?? null,
                message: anyErr?.message ?? null,
                code: anyErr?.code ?? null,
                status: anyErr?.status ?? null,
                moreInfo: anyErr?.moreInfo ?? null,
              }
            : { message: String(err) },
        },
        'sms.send_otp.failed',
      );
      throw err;
    }
  },

  async sendNotification(phoneNumber: string, message: string) {
    // TODO: trocar por implementação real com Twilio (ou outro provedor).
    logger.info({ phoneLast4: phoneNumber.slice(-4), hasMessage: Boolean(message) }, 'sms.send_notification.requested');
    await new Promise((resolve) => setTimeout(resolve, 50));
    return true;
  },
};
