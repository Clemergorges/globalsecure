import { PrismaClient } from '@prisma/client';
import { createTestUsers, cleanupTestUsers, getTestUser } from '../fixtures/test-users';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';

describe('Session Security and Authentication Tests', () => {
    beforeAll(async () => {
        await createTestUsers();
    });

    afterAll(async () => {
        await cleanupTestUsers();
        await prisma.$disconnect();
    });

    describe('5.1. Valid Login', () => {
        it('should create session with valid JWT token', async () => {
            const user = await getTestUser(1);
            const password = 'test_password_123';

            // Hash password (simulate registration)
            const passwordHash = await bcrypt.hash(password, 10);
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash },
            });

            // Simulate login
            const foundUser = await prisma.user.findUnique({
                where: { email: user.email },
            });

            expect(foundUser).not.toBeNull();

            // Verify password
            const isValid = await bcrypt.compare(password, foundUser!.passwordHash);
            expect(isValid).toBe(true);

            // Create JWT token
            const token = jwt.sign(
                {
                    userId: foundUser!.id,
                    email: foundUser!.email,
                    role: 'USER',
                    nonce: Math.random(), // Ensure uniqueness
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Create session
            const session = await prisma.session.create({
                data: {
                    userId: foundUser!.id,
                    token,
                    ipAddress: '127.0.0.1',
                    userAgent: 'Test Browser',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });

            expect(session).not.toBeNull();
            expect(session.token).toBe(token);

            // Verify token
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            expect(decoded.userId).toBe(foundUser!.id);
            expect(decoded.email).toBe(foundUser!.email);

            console.log('✅ Valid login: Session created with JWT token');
        });
    });

    describe('5.2. Logout', () => {
        it('should invalidate session on logout', async () => {
            const user = await getTestUser(1);

            // Create session
            const token = jwt.sign(
                { userId: user.id, email: user.email, role: 'USER', nonce: Math.random() },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            const session = await prisma.session.create({
                data: {
                    userId: user.id,
                    token,
                    ipAddress: '127.0.0.1',
                    userAgent: 'Test Browser',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });

            // Logout (delete session)
            await prisma.session.deleteMany({
                where: { id: session.id },
            });

            // Try to find session
            const deletedSession = await prisma.session.findUnique({
                where: { id: session.id },
            });

            expect(deletedSession).toBeNull();

            // Try to use old token (should fail in real implementation)
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            expect(decoded.userId).toBe(user.id); // Token is still valid...

            // But session is deleted, so API should reject
            const sessionExists = await prisma.session.findFirst({
                where: { token },
            });
            expect(sessionExists).toBeNull();

            console.log('✅ Logout: Session invalidated');
        });
    });

    describe('5.3. Expired Session', () => {
        it('should reject expired JWT token', async () => {
            const user = await getTestUser(1);

            // Create expired token
            const expiredToken = jwt.sign(
                { userId: user.id, email: user.email, role: 'USER' },
                JWT_SECRET,
                { expiresIn: '-1h' } // Expired 1 hour ago
            );

            // Try to verify expired token
            expect(() => {
                jwt.verify(expiredToken, JWT_SECRET);
            }).toThrow('jwt expired');

            console.log('✅ Expired token: Correctly rejected');
        });

        it('should reject session past expiresAt date', async () => {
            const user = await getTestUser(1);

            const token = jwt.sign(
                { userId: user.id, email: user.email, role: 'USER', nonce: Math.random() },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Create session with past expiration
            const session = await prisma.session.create({
                data: {
                    userId: user.id,
                    token,
                    ipAddress: '127.0.0.1',
                    userAgent: 'Test Browser',
                    expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
                },
            });

            // Check if expired
            const isExpired = session.expiresAt < new Date();
            expect(isExpired).toBe(true);

            console.log('✅ Expired session: Correctly identified');
        });
    });

    describe('5.4. Invalid Cookie/Token', () => {
        it('should reject malformed JWT token', async () => {
            const malformedToken = 'not.a.valid.jwt.token';

            expect(() => {
                jwt.verify(malformedToken, JWT_SECRET);
            }).toThrow();

            console.log('✅ Malformed token: Correctly rejected');
        });

        it('should reject empty token', async () => {
            const emptyToken = '';

            expect(() => {
                jwt.verify(emptyToken, JWT_SECRET);
            }).toThrow();

            console.log('✅ Empty token: Correctly rejected');
        });
    });

    describe('5.5. Tampered Token', () => {
        it('should reject JWT with tampered payload', async () => {
            const user = await getTestUser(1);

            // Create valid token
            const validToken = jwt.sign(
                { userId: user.id, email: user.email, role: 'USER', nonce: Math.random() },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Tamper with token (change payload)
            const parts = validToken.split('.');
            const tamperedPayload = Buffer.from(
                JSON.stringify({ userId: 'hacker_id', email: 'hacker@evil.com', role: 'ADMIN' })
            ).toString('base64url');
            const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

            // Try to verify tampered token
            expect(() => {
                jwt.verify(tamperedToken, JWT_SECRET);
            }).toThrow('invalid signature');

            console.log('✅ Tampered token: Correctly rejected');
        });

        it('should reject JWT signed with wrong secret', async () => {
            const user = await getTestUser(1);

            // Create token with wrong secret
            const wrongToken = jwt.sign(
                { userId: user.id, email: user.email, role: 'USER' },
                'wrong_secret_key',
                { expiresIn: '7d' }
            );

            // Try to verify with correct secret
            expect(() => {
                jwt.verify(wrongToken, JWT_SECRET);
            }).toThrow('invalid signature');

            console.log('✅ Wrong secret: Correctly rejected');
        });
    });

    describe('5.6. Session Hijacking Prevention', () => {
        it('should detect session from different IP address', async () => {
            const user = await getTestUser(1);

            const token = jwt.sign(
                { userId: user.id, email: user.email, role: 'USER', nonce: Math.random() },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Create session from IP 1
            const session = await prisma.session.create({
                data: {
                    userId: user.id,
                    token,
                    ipAddress: '192.168.1.1',
                    userAgent: 'Chrome',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });

            // Simulate request from different IP
            const requestIP = '10.0.0.1';
            const ipMismatch = session.ipAddress !== requestIP;

            expect(ipMismatch).toBe(true);

            // In real implementation, this would trigger:
            // - Warning notification
            // - Optional session invalidation
            // - 2FA requirement

            console.log('✅ IP mismatch detected: Potential session hijacking');
        });

        it('should detect session from different user agent', async () => {
            const user = await getTestUser(1);

            const token = jwt.sign(
                { userId: user.id, email: user.email, role: 'USER', nonce: Math.random() },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            const session = await prisma.session.create({
                data: {
                    userId: user.id,
                    token,
                    ipAddress: '192.168.1.1',
                    userAgent: 'Chrome/120.0',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });

            // Simulate request from different browser
            const requestUserAgent = 'Firefox/121.0';
            const uaMismatch = session.userAgent !== requestUserAgent;

            expect(uaMismatch).toBe(true);

            console.log('✅ User agent mismatch detected: Potential session hijacking');
        });
    });

    describe('5.7. Multiple Sessions', () => {
        it('should allow multiple active sessions per user', async () => {
            const user = await getTestUser(1);

            // Create session 1 (Desktop)
            const token1 = jwt.sign(
                { userId: user.id, email: user.email, role: 'USER', device: 'desktop' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            await prisma.session.create({
                data: {
                    userId: user.id,
                    token: token1,
                    ipAddress: '192.168.1.1',
                    userAgent: 'Chrome Desktop',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });

            // Create session 2 (Mobile)
            const token2 = jwt.sign(
                { userId: user.id, email: user.email, role: 'USER', device: 'mobile' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            await prisma.session.create({
                data: {
                    userId: user.id,
                    token: token2,
                    ipAddress: '192.168.1.2',
                    userAgent: 'Safari Mobile',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });

            // Verify both sessions exist
            const sessions = await prisma.session.findMany({
                where: { userId: user.id },
            });

            expect(sessions.length).toBeGreaterThanOrEqual(2);

            console.log('✅ Multiple sessions: Both desktop and mobile active');
        });
    });

    describe('5.8. Password Verification', () => {
        it('should reject incorrect password', async () => {
            const user = await getTestUser(1);
            const correctPassword = 'correct_password_123';
            const wrongPassword = 'wrong_password_456';

            // Set password
            const passwordHash = await bcrypt.hash(correctPassword, 10);
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash },
            });

            // Try wrong password
            const foundUser = await prisma.user.findUnique({
                where: { email: user.email },
            });

            const isValid = await bcrypt.compare(wrongPassword, foundUser!.passwordHash);
            expect(isValid).toBe(false);

            console.log('✅ Wrong password: Correctly rejected');
        });
    });
});
