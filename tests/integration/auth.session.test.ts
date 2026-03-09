import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createSession, revokeSession, validateSession } from '@/lib/session';
import { NextRequest } from 'next/server';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { POST as refreshPost } from '@/app/api/auth/refresh/route';

describe('Block 1: Session and Authentication', () => {
    let user: any;
    let admin: any;
    const userPassword = 'password123';
    const userEmail = 'test.session@example.com';
    const adminEmail = 'test.admin@example.com';

    beforeAll(async () => {
        const existing = await prisma.user.findMany({
            where: { email: { in: [userEmail, adminEmail] } },
            select: { id: true },
        });
        const existingIds = existing.map((u) => u.id);
        if (existingIds.length) {
            await prisma.session.deleteMany({ where: { userId: { in: existingIds } } });
        }
        await prisma.user.deleteMany({ where: { email: userEmail } });
        await prisma.user.deleteMany({ where: { email: adminEmail } });

        // Create a test user
        user = await prisma.user.create({
            data: {
                email: userEmail,
                passwordHash: await hashPassword(userPassword),
                emailVerified: true,
                role: 'END_USER', // Explicitly set role
            },
        });

        admin = await prisma.user.create({
            data: {
                email: adminEmail,
                passwordHash: await hashPassword(userPassword),
                emailVerified: true,
                role: 'ADMIN',
            },
        });
    });

    afterAll(async () => {
        const ids = [user?.id, admin?.id].filter(Boolean);
        if (ids.length) {
            await prisma.session.deleteMany({ where: { userId: { in: ids } } });
        }
        await prisma.user.deleteMany({ where: { email: userEmail } });
        await prisma.user.deleteMany({ where: { email: adminEmail } });
    });

    let authToken: string | undefined;

    it('1.1) should create a session in the database for a user', async () => {
        const { token } = await createSession(
            { id: user.id, role: user.role },
            '127.0.0.1',
            'jest-test-agent'
        );

        authToken = token;

        const session = await prisma.session.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        expect(session).not.toBeNull();
        expect(session?.revokedAt).toBeNull();
        expect(session?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('1.1) should use shorter expiry for ADMIN/ops roles', async () => {
        const before = Date.now();
        await createSession(
            { id: admin.id, role: admin.role },
            '127.0.0.1',
            'jest-test-agent'
        );

        const session = await prisma.session.findFirst({
            where: { userId: admin.id },
            orderBy: { createdAt: 'desc' }
        });

        expect(session).not.toBeNull();
        const maxAgeSeconds = Math.floor((session!.expiresAt.getTime() - before) / 1000);
        expect(maxAgeSeconds).toBeGreaterThan(55 * 60);
        expect(maxAgeSeconds).toBeLessThan(65 * 60);
    });
    
    it('1.2) should reject an expired session when validating', async () => {
        await prisma.session.updateMany({
            where: { userId: user.id },
            data: { expiresAt: new Date(Date.now() - 1000) }
        });

        const request = new NextRequest('http://localhost/api/test', {
            headers: {
                cookie: `auth_token=${authToken}`
            }
        });

        const result = await validateSession(request as any);
        expect(result).toBeNull();

        const session = await prisma.session.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        expect(session).not.toBeNull();
    });

    it('1.3) should revoke a session and mark it as revoked in the database', async () => {
        await createSession(
            { id: user.id, role: user.role },
            '127.0.0.1',
            'jest-test-agent'
        );

        const session = await prisma.session.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        expect(session).not.toBeNull();

        await revokeSession(session!.id);

        const revokedSession = await prisma.session.findUnique({
            where: { id: session!.id }
        });

        expect(revokedSession).not.toBeNull();
        expect(revokedSession?.revokedAt).not.toBeNull();
    });

    it('1.3) should reject session when user-agent mismatches', async () => {
        // GSS-MVP-FIX: align test with new MVP scope.
        const previousStrictUa = process.env.SESSION_STRICT_UA;
        process.env.SESSION_STRICT_UA = 'true';
        const { token } = await createSession(
            { id: user.id, role: user.role },
            '127.0.0.1',
            'jest-test-agent'
        );

        const request = new NextRequest('http://localhost/api/test', {
            headers: {
                cookie: `auth_token=${token}`,
                'user-agent': 'different-agent'
            }
        });

        const result = await validateSession(request as any);
        expect(result).toBeNull();

        const latest = await prisma.session.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });
        expect(latest?.revokedAt).not.toBeNull();

        process.env.SESSION_STRICT_UA = previousStrictUa;
    });

    it('1.2) should logout, revoke the session, and clear cookie', async () => {
        const { token } = await createSession(
            { id: user.id, role: user.role },
            '127.0.0.1',
            'jest-test-agent'
        );

        const beforeLogout = new NextRequest('http://localhost/api/test', {
            headers: {
                cookie: `auth_token=${token}`,
                'user-agent': 'jest-test-agent'
            }
        });
        const before = await validateSession(beforeLogout as any);
        expect(before?.userId).toBe(user.id);

        const logoutReq = new NextRequest('http://localhost/api/auth/logout', {
            method: 'POST',
            headers: {
                cookie: `auth_token=${token}`,
                'user-agent': 'jest-test-agent'
            }
        });

        const logoutRes = await logoutPost(logoutReq as any);
        const setCookie = logoutRes.headers.get('set-cookie') || '';
        expect(setCookie).toContain('auth_token=');
        expect(setCookie).toContain('Max-Age=0');

        let revokedAt: Date | null | undefined = undefined;
        for (let i = 0; i < 10; i++) {
            const sessions = await prisma.session.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
            revokedAt = sessions[0]?.revokedAt;
            if (revokedAt) break;
            await new Promise((r) => setTimeout(r, 20));
        }
        expect(revokedAt).not.toBeNull();
    });

    it('1.3) should rotate session on refresh and invalidate old token', async () => {
        const { token } = await createSession(
            { id: user.id, role: user.role },
            '127.0.0.1',
            'jest-test-agent'
        );

        const refreshReq = new NextRequest('http://localhost/api/auth/refresh', {
            method: 'POST',
            headers: {
                cookie: `auth_token=${token}`,
                'user-agent': 'jest-test-agent'
            }
        });

        const refreshRes = await refreshPost(refreshReq as any);
        const setCookie = refreshRes.headers.get('set-cookie') || '';
        const newToken = setCookie.split(';')[0]?.split('=')[1];
        expect(newToken).toBeTruthy();

        const oldReq = new NextRequest('http://localhost/api/test', {
            headers: {
                cookie: `auth_token=${token}`,
                'user-agent': 'jest-test-agent'
            }
        });
        const oldSession = await validateSession(oldReq as any);
        expect(oldSession).toBeNull();

        const newReq = new NextRequest('http://localhost/api/test', {
            headers: {
                cookie: `auth_token=${newToken}`,
                'user-agent': 'jest-test-agent'
            }
        });
        const newSession = await validateSession(newReq as any);
        expect(newSession?.userId).toBe(user.id);
    });
});
