
import { describe, expect, it } from '@jest/globals';
import { alertService } from '@/lib/services/alert';
import { prisma } from '@/lib/db';

jest.mock('@/lib/services/email', () => ({
  sendEmail: jest.fn(),
}));

describe('Monitoring & Alerts', () => {
  
  it('should log an alert to the database', async () => {
    await alertService.notify({
        title: 'Test Alert',
        message: 'This is a test alert for monitoring verification.',
        severity: 'INFO',
        source: 'TEST_SUITE',
        userId: 'system-test'
    });

    const log = await prisma.auditLog.findFirst({
        where: { action: 'ALERT_INFO', userId: 'system-test' },
        orderBy: { createdAt: 'desc' }
    });

    expect(log).toBeDefined();
    expect(log?.metadata).toMatchObject({ title: 'Test Alert' });
    
    // Cleanup
    if (log) await prisma.auditLog.delete({ where: { id: log.id } });
  });

});
