
import { logger } from '@/lib/logger';

export const smsService = {
  async sendOTP(phoneNumber: string, code: string) {
    // TODO: trocar por implementação real com Twilio (ou outro provedor) e tratar erros/retentativas.
    // Nunca logar `code` (OTP) em nenhum ambiente.
    logger.info({ phoneLast4: phoneNumber.slice(-4) }, 'sms.send_otp.requested');
    await new Promise((resolve) => setTimeout(resolve, 200));
    return true;
  },

  async sendNotification(phoneNumber: string, message: string) {
    // TODO: trocar por implementação real com Twilio (ou outro provedor).
    logger.info({ phoneLast4: phoneNumber.slice(-4), hasMessage: Boolean(message) }, 'sms.send_notification.requested');
    await new Promise((resolve) => setTimeout(resolve, 50));
    return true;
  },
};
