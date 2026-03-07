
import { describe, expect, it } from '@jest/globals';
import { alertService } from '@/lib/services/alert';

const auditCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    auditLog: {
      create: (...args: any[]) => auditCreate(...args),
    },
  },
}));

jest.mock('@/lib/services/email', () => ({
  sendEmail: jest.fn(),
}));

describe('Monitoring & Alerts', () => {
  
  it('should log an alert to the database', async () => {
    auditCreate.mockResolvedValue({ id: 'log1', metadata: { title: 'Test Alert' } });

    await alertService.notify({
        title: 'Test Alert',
        message: 'This is a test alert for monitoring verification.',
        severity: 'INFO',
        source: 'TEST_SUITE',
        userId: 'system-test'
    });

    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate.mock.calls[0][0]).toMatchObject({
      data: {
        action: 'ALERT_INFO',
        userId: 'system-test',
      },
    });
  });

});
