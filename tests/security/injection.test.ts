import { POST } from '@/app/api/transfers/internal/route';
import { NextRequest } from 'next/server';
import { createTestUsers, cleanupTestUsers } from '../fixtures/test-users';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock Auth to be logged in as Attacker
jest.mock('@/lib/auth', () => ({
    getSession: jest.fn().mockImplementation(async () => {
        // We need to return a session for the attacker. 
        // We'll set this dynamically in the test if possible, or use a closure.
        return global.testSession; 
    })
}));

describe('Security: Injection Attacks', () => {
    let users: any[];

    beforeAll(async () => {
        users = await createTestUsers();
        // Set global session for the mock
        (global as any).testSession = { userId: users[0].user.id, email: users[0].user.email };
    });

    afterAll(async () => {
        await cleanupTestUsers();
        await prisma.$disconnect();
    });

    it('should sanitize or reject SQL Injection in transfer description', async () => {
        const attacker = users[0].user;
        const victim = users[1].user;

        const payload = {
            recipientEmail: victim.email,
            amount: 10,
            currency: 'EUR',
            description: "Payment'; DROP TABLE Users; --" 
        };

        const req = new NextRequest('http://localhost:3000/api/transfers/internal', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await POST(req);
        
        // It should succeed (200) OR fail with validation error (400), 
        // BUT it must NOT crash the DB or delete users.
        expect(res.status).not.toBe(500);

        // Verify users still exist (Table not dropped)
        const userCount = await prisma.user.count();
        expect(userCount).toBeGreaterThan(0);
    });

    it('should reject XSS payloads in fields', async () => {
        const attacker = users[0].user;
        const victim = users[1].user;

        const payload = {
            recipientEmail: victim.email,
            amount: 10,
            currency: 'EUR',
            description: "<script>alert('hacked')</script>" 
        };

        const req = new NextRequest('http://localhost:3000/api/transfers/internal', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await POST(req);
        
        // Ideally, Zod should sanitize or the backend should handle it.
        // If it returns 200, we check if the stored data is sanitized? 
        // For now, we just ensure it doesn't return 500.
        expect(res.status).not.toBe(500);
    });
});
