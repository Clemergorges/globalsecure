import { prisma } from '../setup/prisma';
import { PATCH as profilePatch } from '@/app/api/user/profile/route';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import { getSession } from '@/lib/auth';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('PATCH /api/user/profile phone validation', () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    if (createdUserIds.length) {
      await prisma.kYCDocument.deleteMany({ where: { userId: { in: createdUserIds } } });
    }
    await prisma.account.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.splice(0, createdUserIds.length);
  });

  async function createUser(country: string) {
    const email = `${uid(`phone_${country.toLowerCase()}`)}@test.com`;
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

  test('normaliza removendo espaços', async () => {
    const userId = await createUser('LU');
    const res = await patchAs(userId, { phone: '+352 621 234 567' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.phone).toBe('+352621234567');
  });

  test('rejeita formato fora de E.164', async () => {
    const userId = await createUser('LU');
    const bad = await patchAs(userId, { phone: '621234567' });
    expect(bad.status).toBe(400);
  });

  test('rejeita DDI diferente do país', async () => {
    const userId = await createUser('BR');
    const bad = await patchAs(userId, { phone: '+352621234567' });
    expect(bad.status).toBe(400);
  });

  test('aceita DDI correto do país', async () => {
    const userId = await createUser('BR');
    const ok = await patchAs(userId, { phone: '+5511999999999' });
    expect(ok.status).toBe(200);
  });
});

