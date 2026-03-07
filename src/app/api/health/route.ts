import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isYieldSpendingEnabled } from '@/lib/services/fiat-ledger';

export async function GET() {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json(
      { status: 'ok', timestamp: new Date().toISOString(), yieldSpendingEnabled: isYieldSpendingEnabled() },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'error', message: 'Database connection failed' },
      { status: 503 }
    );
  }
}
