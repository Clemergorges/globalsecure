
import twilio from 'twilio';
import { logger } from '@/lib/logger';
import { env } from '@/lib/config/env';

function lastDigits(phoneNumber: string, len: number) {
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.slice(-len);
}

function isTwilioProvider(provider: string): provider is 'verify' | 'messaging' {
  return provider === 'verify' || provider === 'messaging';
}

function assertTwilioConfigured(provider: 'verify' | 'messaging') {
  const nodeEnv = env.nodeEnv();
  const accountSid = env.twilioAccountSid();
  const authToken = env.twilioAuthToken();

  const missing: string[] = [];
  if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
  if (!authToken) missing.push('TWILIO_AUTH_TOKEN');

  if (provider === 'verify') {
    if (!env.twilioVerifyServiceSid()) missing.push('TWILIO_VERIFY_SERVICE_SID');
  } else {
    if (!env.twilioMessagingServiceSid() && !env.twilioFromNumber()) {
      missing.push('TWILIO_MESSAGING_SERVICE_SID|TWILIO_FROM_NUMBER|TWILIO_PHONE_NUMBER');
    }
  }

  if (missing.length) {
    const message = `Twilio not configured for provider "${provider}". Missing: ${missing.join(', ')}`;
    throw new Error(message);
  }
}

function twilioClient() {
  return twilio(env.twilioAccountSid(), env.twilioAuthToken());
}

async function sendViaVerify(phoneNumber: string) {
  assertTwilioConfigured('verify');
  const serviceSid = env.twilioVerifyServiceSid();
  const verification = await twilioClient().verify.v2
    .services(serviceSid)
    .verifications.create({ to: phoneNumber, channel: 'sms' });
  return verification;
}

async function checkViaVerify(phoneNumber: string, code: string) {
  assertTwilioConfigured('verify');
  const serviceSid = env.twilioVerifyServiceSid();
  const check = await twilioClient().verify.v2.services(serviceSid).verificationChecks.create({ to: phoneNumber, code });
  return check;
}

async function sendViaMessaging(phoneNumber: string, code: string) {
  assertTwilioConfigured('messaging');
  const messagingServiceSid = env.twilioMessagingServiceSid();
  const from = env.twilioFromNumber();
  const body = `Seu código de verificação é: ${code}`;

  const message = await twilioClient().messages.create(
    messagingServiceSid ? { to: phoneNumber, messagingServiceSid, body } : { to: phoneNumber, from, body },
  );
  return message;
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

    if (!isTwilioProvider(provider)) {
      throw new Error(`Invalid SMS_PROVIDER: ${provider}`);
    }

    try {
      if (provider === 'verify') {
        const verification = await sendViaVerify(phoneNumber);
        logger.info(
          { provider, phoneLast4, sid: verification.sid, status: verification.status, valid: verification.valid ?? null },
          'sms.send_otp.twilio_verify',
        );
        return true;
      }

      const message = await sendViaMessaging(phoneNumber, code);
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

  async checkOTP(phoneNumber: string, code: string) {
    const provider = env.smsProvider();
    const phoneLast4 = lastDigits(phoneNumber, 4);
    if (provider !== 'verify') {
      throw new Error('checkOTP is only supported when SMS_PROVIDER=verify');
    }

    try {
      const check = await checkViaVerify(phoneNumber, code);
      logger.info(
        { provider, phoneLast4, sid: check.sid, status: check.status, valid: check.valid ?? null },
        'sms.check_otp.twilio_verify',
      );
      return { approved: check.status === 'approved' };
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
        'sms.check_otp.failed',
      );
      throw err;
    }
  },

  async sendNotification(phoneNumber: string, message: string) {
    const phoneLast4 = lastDigits(phoneNumber, 4);
    logger.info({ phoneLast4, hasMessage: Boolean(message) }, 'sms.send_notification.requested');
    await new Promise((resolve) => setTimeout(resolve, 50));
    return true;
  },
};
