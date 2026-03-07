import React from 'react';

export type TransactionItem = {
  id: string;
  date: string;
  description?: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  expiresAt?: string;
  metadata?: any;
};

export default function TransactionsList() {
  return null;
}
