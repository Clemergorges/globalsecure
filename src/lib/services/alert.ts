
import { IncomingWebhook } from '@slack/webhook';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/services/email';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'security@globalsecuresend.com';

const webhook = SLACK_WEBHOOK_URL ? new IncomingWebhook(SLACK_WEBHOOK_URL) : null;

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKER';
export type AlertChannel = 'SLACK' | 'EMAIL' | 'DB' | 'ALL';

interface AlertPayload {
  title: string;
  message: string;
  severity: AlertSeverity;
  source: string; // e.g., 'AUTH', 'PAYMENT', 'KYC'
  userId?: string;
  metadata?: Record<string, any>;
  channels?: AlertChannel[];
}

export const alertService = {
  async notify(payload: AlertPayload) {
    const { title, message, severity, source, userId, metadata, channels = ['ALL'] } = payload;
    const timestamp = new Date().toISOString();

    // 1. Log to Database (Always, unless explicitly excluded)
    if (channels.includes('ALL') || channels.includes('DB')) {
        try {
            await prisma.auditLog.create({
                data: {
                    userId: userId || 'SYSTEM',
                    action: `ALERT_${severity}`,
                    status: severity === 'INFO' ? 'SUCCESS' : 'FAILURE',
                    metadata: { title, message, source, ...metadata }
                }
            });
        } catch (error) {
            console.error('Failed to log alert to DB:', error);
        }
    }

    // 2. Send to Slack
    if ((channels.includes('ALL') || channels.includes('SLACK')) && webhook) {
        const colorMap = {
            'INFO': '#36a64f', // Green
            'WARNING': '#ecb22e', // Yellow
            'CRITICAL': '#e01e5a', // Red
            'BLOCKER': '#000000' // Black
        };

        try {
            await webhook.send({
                text: `[${severity}] ${title}`,
                attachments: [{
                    color: colorMap[severity],
                    fields: [
                        { title: 'Source', value: source, short: true },
                        { title: 'User ID', value: userId || 'N/A', short: true },
                        { title: 'Message', value: message, short: false },
                        { title: 'Time', value: timestamp, short: true }
                    ]
                }]
            });
        } catch (error) {
            console.error('Failed to send Slack alert:', error);
        }
    }

    // 3. Send Email (Only for Critical/Blocker or explicit request)
    const shouldEmail = (channels.includes('ALL') && ['CRITICAL', 'BLOCKER'].includes(severity)) || channels.includes('EMAIL');
    
    if (shouldEmail) {
        try {
            await sendEmail({
                to: ADMIN_EMAIL,
                subject: `🚨 [${severity}] ${title}`,
                html: `
                    <h2>Security Alert: ${title}</h2>
                    <p><strong>Severity:</strong> <span style="color: red">${severity}</span></p>
                    <p><strong>Source:</strong> ${source}</p>
                    <p><strong>User ID:</strong> ${userId || 'N/A'}</p>
                    <p><strong>Message:</strong> ${message}</p>
                    <p><strong>Timestamp:</strong> ${timestamp}</p>
                    <pre>${JSON.stringify(metadata, null, 2)}</pre>
                `
            });
        } catch (error) {
            console.error('Failed to send email alert:', error);
        }
    }
  }
};
