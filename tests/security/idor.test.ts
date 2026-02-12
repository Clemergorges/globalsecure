import { GET } from '@/app/api/wallet/[userId]/balance-usdt/route';
import { NextRequest } from 'next/server';
import { createTestUsers, cleanupTestUsers } from '../fixtures/test-users';
import { getSession } from '@/lib/auth';

// Mock the polygon service
jest.mock('@/lib/services/polygon', () => ({
  getUserBalanceUsdt: jest.fn().mockResolvedValue('100.00'),
  getUsdtPriceUsd: jest.fn().mockResolvedValue(1.0),
  deriveUserAddress: jest.fn().mockResolvedValue('0x123'),
}));

// Mock auth service
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

describe('Security: IDOR (Insecure Direct Object Reference)', () => {
    let users: any[];

    beforeAll(async () => {
        users = await createTestUsers();
    });

    afterAll(async () => {
        await cleanupTestUsers();
    });

    it('should BLOCK unauthorized access to another users crypto balance', async () => {
        const victim = users[0].user;
        const attacker = users[1].user;

        // Mock session as Attacker
        (getSession as jest.Mock).mockResolvedValue({
            userId: attacker.id,
            role: 'USER',
        });

        // Attacker tries to access Victim's balance
        const req = new NextRequest(`http://localhost:3000/api/wallet/${victim.id}/balance-usdt`);
        
        // Mocking params as Next.js 15 expects (Promise)
        const params = Promise.resolve({ userId: victim.id });
        
        // Execute Route Handler
        const res = await GET(req, { params });
        
        console.log(`IDOR Test Status: ${res.status}`);
        
        // Should be 403 Forbidden because attacker.id !== victim.id
        expect([401, 403]).toContain(res.status);
    });

    it('should ALLOW access to own crypto balance', async () => {
        const victim = users[0].user;

        // Mock session as Victim (Own access)
        (getSession as jest.Mock).mockResolvedValue({
            userId: victim.id,
            role: 'USER',
        });

        const req = new NextRequest(`http://localhost:3000/api/wallet/${victim.id}/balance-usdt`);
        const params = Promise.resolve({ userId: victim.id });
        
        const res = await GET(req, { params });
        
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.balanceUsdt).toBe('100.00');
    });
});
