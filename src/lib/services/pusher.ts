import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || 'mock_app_id',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'mock_key',
  secret: process.env.PUSHER_SECRET || 'mock_secret',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
  useTLS: true,
});

export const pusherService = {
  trigger: async (channel: string, event: string, data: any) => {
    try {
      if (process.env.NODE_ENV === 'test') return; // Skip in tests (though we mock it anyway)
      await pusher.trigger(channel, event, data);
    } catch (error) {
      console.error('Pusher Trigger Error:', error);
    }
  }
};
