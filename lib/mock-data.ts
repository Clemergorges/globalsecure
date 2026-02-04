export const MOCK_TRANSACTIONS = [
  {
    id: 'tx_1',
    senderId: 'user_1',
    recipientName: 'Maria Silva',
    amountSent: 150.00,
    currencySent: 'EUR',
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    type: 'DEBIT'
  },
  {
    id: 'tx_2',
    senderId: 'other_user',
    recipientName: 'João Santos', // Sender name in this case
    amountSent: 1250.50,
    currencySent: 'EUR',
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    type: 'CREDIT'
  },
  {
    id: 'tx_3',
    senderId: 'user_1',
    recipientName: 'Netflix Inc.',
    amountSent: 15.90,
    currencySent: 'USD',
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    type: 'DEBIT'
  },
  {
    id: 'tx_4',
    senderId: 'user_1',
    recipientName: 'Uber Rides',
    amountSent: 8.50,
    currencySent: 'EUR',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    type: 'DEBIT'
  }
];

export const MOCK_CARDS = [
  {
    id: 'card_1',
    last4: '4242',
    brand: 'VISA',
    expiry: '12/28',
    status: 'ACTIVE',
    alias: 'Compras Online'
  },
  {
    id: 'card_2',
    last4: '8899',
    brand: 'MASTERCARD',
    expiry: '10/27',
    status: 'FROZEN',
    alias: 'Assinaturas'
  }
];
