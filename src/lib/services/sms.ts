
// Mock SMS Service (Simulating Twilio)
// In production, this would use 'twilio' SDK

export const smsService = {
  async sendOTP(phoneNumber: string, code: string) {
    console.log(`[SMS MOCK] Sending OTP "${code}" to ${phoneNumber}`);
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  },

  async sendNotification(phoneNumber: string, message: string) {
    console.log(`[SMS MOCK] Sending Notification to ${phoneNumber}: "${message}"`);
    return true;
  }
};
