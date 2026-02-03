import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || 'mock',
  key: process.env.PUSHER_KEY || 'mock',
  secret: process.env.PUSHER_SECRET || 'mock',
  cluster: process.env.PUSHER_CLUSTER || 'eu',
  useTLS: true,
});

export const pusherService = {
  async trigger(channel: string, event: string, data: any) {
    console.log(`[Pusher Mock] Trigger ${event} on ${channel}`, data);
    // In a real scenario with valid keys, we would call:
    // return pusher.trigger(channel, event, data);
    return Promise.resolve();
  }
};
