import { GET } from '@/app/api/wallet/[userId]/balance-usdt/route';
import { NextRequest } from 'next/server';
import { createTestUsers, cleanupTestUsers } from '../fixtures/test-users';
import { createSession } from '@/lib/session';

// Mock the polygon service
jest.mock('@/lib/services/polygon', () => ({
  getUserBalanceUsdt: jest.fn().mockResolvedValue('100.00'),
  getUsdtPriceUsd: jest.fn().mockResolvedValue(1.0),
  deriveUserAddress: jest.fn().mockResolvedValue('0x123'),
}));

describe('Security: IDOR (Insecure Direct Object Reference)', () => {
    let users: any[];
    const userAgent = 'jest-test-agent';

    beforeAll(async () => {
        users = await createTestUsers();
    });

    afterAll(async () => {
        await cleanupTestUsers();
    });

    it('should BLOCK unauthorized access to another users crypto balance', async () => {
        const victim = users[0].user;
        const attacker = users[1].user;

        // GSS-MVP-FIX: align test with new MVP scope.
        const { token } = await createSession({ id: attacker.id, role: attacker.role || 'END_USER' }, '127.0.0.1', userAgent);

        // Attacker tries to access Victim's balance
        const req = new NextRequest(`http://localhost:3000/api/wallet/${victim.id}/balance-usdt`, {
          headers: { cookie: `auth_token=${token}`, 'user-agent': userAgent }
        });
        
        // Mocking params as Next.js 15 expects (Promise)
        const params = Promise.resolve({ userId: victim.id });
        
        // Execute Route Handler
        const res = await GET(req, { params });
        
        // Should be 403 Forbidden because attacker.id !== victim.id
        expect(res.status).toBe(403);
    });

    it('should ALLOW access to own crypto balance', async () => {
        const victim = users[0].user;

        // GSS-MVP-FIX: align test with new MVP scope.
        const { token } = await createSession({ id: victim.id, role: victim.role || 'END_USER' }, '127.0.0.1', userAgent);

        const req = new NextRequest(`http://localhost:3000/api/wallet/${victim.id}/balance-usdt`, {
          headers: { cookie: `auth_token=${token}`, 'user-agent': userAgent }
        });
        const params = Promise.resolve({ userId: victim.id });
        
        const res = await GET(req, { params });
        
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.balanceUsdt).toBe('100.00');
    });
});
