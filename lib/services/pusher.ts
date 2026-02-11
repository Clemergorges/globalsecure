import Pusher from 'pusher';

const _pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER || 'eu',
  useTLS: true,
});

export const pusherService = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async trigger(channel: string, event: string, data: any) {
    console.log(`[Pusher] Trigger ${event} on ${channel}`, data);
    return _pusher.trigger(channel, event, data);
  }
};
