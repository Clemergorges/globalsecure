import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/logger';

export async function createPrivacyIncident(params: {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedUserCount?: number;
  createdByUserId?: string;
  ip?: string;
  userAgent?: string;
}) {
  const incident = await prisma.privacyIncident.create({
    data: {
      severity: params.severity,
      description: params.description,
      affectedUserCount: params.affectedUserCount ?? 0,
      status: 'OPEN',
      createdByUserId: params.createdByUserId,
    }
  });

  await logAudit({
    userId: params.createdByUserId,
    action: 'PRIVACY_INCIDENT_CREATE',
    status: '201',
    ipAddress: params.ip,
    userAgent: params.userAgent,
    path: '/api/admin/privacy/incidents',
    metadata: { incidentId: incident.id, severity: incident.severity, affectedUserCount: incident.affectedUserCount }
  });

  return incident;
}

export async function notifyPrivacyIncident(params: {
  incidentId: string;
  notifyAuthority?: boolean;
  notifyUsers?: boolean;
  actorUserId?: string;
  ip?: string;
  userAgent?: string;
}) {
  const now = new Date();
  const updated = await prisma.privacyIncident.update({
    where: { id: params.incidentId },
    data: {
      supervisoryNotifiedAt: params.notifyAuthority ? now : undefined,
      userNotifiedAt: params.notifyUsers ? now : undefined,
      status: 'IN_PROGRESS',
    }
  });

  await logAudit({
    userId: params.actorUserId,
    action: 'PRIVACY_INCIDENT_NOTIFY',
    status: '200',
    ipAddress: params.ip,
    userAgent: params.userAgent,
    path: '/api/admin/privacy/incidents/:id/notify',
    metadata: {
      incidentId: updated.id,
      notifyAuthority: Boolean(params.notifyAuthority),
      notifyUsers: Boolean(params.notifyUsers),
    }
  });

  return updated;
}

