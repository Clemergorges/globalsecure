import { prisma } from '../setup/prisma';
import { PATCH as profilePatch } from '@/app/api/user/profile/route';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import { getSession } from '@/lib/auth';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('PATCH /api/user/profile postalCode validation', () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await prisma.kYCDocument.deleteMany({});
    await prisma.account.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.splice(0, createdUserIds.length);
  });

  async function createUser(country: string) {
    const email = `${uid(`postal_${country.toLowerCase()}`)}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country },
      select: { id: true },
    });
    createdUserIds.push(user.id);
    return user.id;
  }

  async function patchAs(userId: string, body: any) {
    (getSession as unknown as jest.Mock).mockResolvedValue({ userId });
    const req = new Request('http://localhost/api/user/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return profilePatch(req);
  }

  test('BR normaliza CEP para 00000-000', async () => {
    const userId = await createUser('BR');
    const res = await patchAs(userId, { postalCode: '01001000' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.postalCode).toBe('01001-000');
  });

  test('LU normaliza para L-0000', async () => {
    const userId = await createUser('LU');
    const res = await patchAs(userId, { postalCode: '1234' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.postalCode).toBe('L-1234');
  });

  test('PT normaliza para 0000-000', async () => {
    const userId = await createUser('PT');
    const res = await patchAs(userId, { postalCode: '1000123' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.postalCode).toBe('1000-123');
  });

  test('FR exige 5 dígitos', async () => {
    const userId = await createUser('FR');
    const bad = await patchAs(userId, { postalCode: '1234' });
    expect(bad.status).toBe(400);
    const ok = await patchAs(userId, { postalCode: '75001' });
    expect(ok.status).toBe(200);
  });

  test('DE exige 5 dígitos', async () => {
    const userId = await createUser('DE');
    const bad = await patchAs(userId, { postalCode: '1234' });
    expect(bad.status).toBe(400);
    const ok = await patchAs(userId, { postalCode: '10115' });
    expect(ok.status).toBe(200);
  });

  test('US aceita 00000 e 00000-0000', async () => {
    const userId = await createUser('US');
    const ok1 = await patchAs(userId, { postalCode: '94105' });
    expect(ok1.status).toBe(200);
    const ok2 = await patchAs(userId, { postalCode: '941051234' });
    expect(ok2.status).toBe(200);
    const data = await ok2.json();
    expect(data.user.postalCode).toBe('94105-1234');
  });
});

