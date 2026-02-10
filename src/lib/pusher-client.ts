
import Pusher from 'pusher-js';

// Use environment variables for keys. 
// Note: NEXT_PUBLIC_ prefix is required for client-side access.
export const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || 'mock', {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
  // In development/mock mode, we might want to log events
  // enabledTransports: ['ws', 'wss'],
});
