import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || process.env.FROM_EMAIL;

  if (!host || !user || !pass || !from) return null;

  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    requireTLS: port === 587,
  });

  return cachedTransporter;
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[Email] SMTP not configured', { to, subject });
    return { ok: false as const, error: 'SMTP_NOT_CONFIGURED' as const };
  }

  try {
    const from = (process.env.EMAIL_FROM || process.env.FROM_EMAIL) as string;

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    console.log('[Email] Sent', { to, messageId: info.messageId });
    return { ok: true as const, messageId: info.messageId };
  } catch (error: any) {
    console.error('[Email] Failed', { to, subject, error: error?.message || String(error) });
    return { ok: false as const, error: 'SMTP_SEND_FAILED' as const };
  }
}

// Templates HTML simples
export const templates = {
  cardClaim: (name: string, amount: string, currency: string, claimLink: string) => {
    const safeName = escapeHtml(name || 'there');
    const safeAmount = escapeHtml(amount);
    const safeCurrency = escapeHtml(currency);
    const safeClaimLink = escapeHtml(claimLink);

    return `
      <div style="font-family: sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
        <h2 style="color: #0f172a; margin: 0 0 12px;">You received a secure payment link via GlobalSecure.</h2>
        <p style="margin: 0 0 16px; color: #334155;">Hello, <strong>${safeName}</strong>!</p>

        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Available amount:</strong> ${safeCurrency} ${safeAmount}</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> Protected by unlock code 🔒</p>
        </div>

        <p style="margin: 0 0 12px; color: #334155;">To access the funds and view the associated virtual card, click the link below.</p>
        <a href="${safeClaimLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: 700;">Open secure link</a>

        <p style="margin: 16px 0 0; color: #334155;">
          <em>For security reasons, the unlock code will be sent to you separately by the sender. You must enter this code to release the card.</em>
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748b; margin: 0;">
          If you did not expect this message, you can ignore it. Without the unlock code, the card cannot be released.
        </p>
      </div>
    `;
  },

  cardCreated: (
    recipientName: string,
    last4: string,
    amount: string,
    currency: string,
    personalMessage?: string | null
  ): string => {
    const safeName = recipientName || 'Customer';
    const safeAmount = amount;
    const safeCurrency = currency;
    const safeLast4 = last4;

    const safePersonalMessage =
      typeof personalMessage === 'string' && personalMessage.trim().length > 0
        ? personalMessage.trim()
        : null;

    const personalBlock = safePersonalMessage
      ? `
        <p><strong>Message from the sender:</strong></p>
        <p>${safePersonalMessage}</p>
      `
      : '';

    return `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">You received a GlobalSecure virtual card</h2>

        <p>Hi <strong>${safeName}</strong>,</p>

        <p>You've received a GlobalSecure virtual card.</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;">
            <strong>Available amount:</strong> ${safeCurrency} ${safeAmount}
          </p>
          <p style="margin: 5px 0;">
            <strong>Card ending in:</strong> ${safeLast4}
          </p>
        </div>

        ${personalBlock}

        <p>
          You can use this card for online purchases at merchants that accept the corresponding card brand.
        </p>

        <p>
          If you have any questions, reply to this email or visit the GlobalSecure help center.
        </p>
      </div>
    `;
  },
  
  welcome: (name: string) => `
    <div style="font-family: sans-serif; color: #333; padding: 20px;">
      <h2>Bem-vindo à GlobalSecure! </h2>
      <p>Olá ${name}, sua conta foi criada com sucesso.</p>
    </div>
  `,

  verificationCode: (code: string) => `
    <div style="font-family: sans-serif; color: #4d4646ff; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #2564eb9f;">Verifique seu Email 🔒</h2>
      <p>Use o código abaixo para confirmar sua conta na GlobalSecure:</p>
      
      <div style="background: #dae2e9ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${code}</span>
      </div>

      <p>Este código expira em 15 minutos.</p>
      <p style="font-size: 12px; color: #666;">Se você não solicitou este código, ignore este e-mail.</p>
    </div>
  `,

  sensitiveActionCode: (code: string, actionLabel: string, ttlMinutes: number) => `
    <div style="font-family: sans-serif; color: #4d4646ff; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #2564eb9f;">Confirmação de Segurança 🔒</h2>
      <p>Use o código abaixo para confirmar: <strong>${actionLabel}</strong>.</p>
      
      <div style="background: #dae2e9ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${code}</span>
      </div>

      <p>Este código expira em ${ttlMinutes} minutos.</p>
      <p style="font-size: 12px; color: #666;">Se você não solicitou esta confirmação, ignore este e-mail.</p>
    </div>
  `,

  passwordResetLink: (resetUrl: string) => `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #2563eb;">Redefinir Senha 🔐</h2>
      <p>Você solicitou a redefinição de senha para sua conta GlobalSecure.</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Ação:</strong> Redefinir senha</p>
        <p style="margin: 5px 0;"><strong>Validade:</strong> 1 hora</p>
      </div>

      <p>Clique no link abaixo para criar uma nova senha:</p>
      <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Redefinir Senha</a>
      
      <p style="margin-top: 20px;"><em>Se você não solicitou esta redefinição, ignore este e-mail. Seu senha atual continuará válida.</em></p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 12px; color: #666;">Este link expira em 1 hora por segurança.</p>
    </div>
  `
  ,

  // GSS-MVP-FIX
  // TODO GSS: i18n key 'card.activatedEmail.subject'
  cardActivated: (params: { recipientName?: string; currency: string; amountAvailable: string; footerLink?: string }) => {
    const safeName = escapeHtml(params.recipientName || 'Customer');
    const safeCurrency = escapeHtml(params.currency);
    const safeAmount = escapeHtml(params.amountAvailable);
    const safeFooterLink = params.footerLink ? escapeHtml(params.footerLink) : null;

    // TODO GSS: i18n key 'card.activatedEmail.body.line1'
    const line1 = `Your GlobalSecure virtual card is now active.`;
    // TODO GSS: i18n key 'card.activatedEmail.body.line2'
    const line2 = `Available amount: ${safeCurrency} ${safeAmount}.`;
    // TODO GSS: i18n key 'card.activatedEmail.body.line3'
    const line3 = `You can use this virtual card anywhere that accepts your card network (e.g. Visa/Mastercard).`;
    // TODO GSS: i18n key 'card.activatedEmail.footer'
    const footer = `When your balance reaches zero, this card will be automatically closed.`;

    return `
      <div style="font-family: sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
        <h2 style="color: #2563eb; margin: 0 0 12px;">GlobalSecure Card Activated</h2>
        <p style="margin: 0 0 16px; color: #334155;">Hello, <strong>${safeName}</strong>!</p>

        <p style="margin: 0 0 10px; color: #334155;">${line1}</p>

        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>${line2}</strong></p>
          <p style="margin: 4px 0;">${line3}</p>
        </div>

        <p style="margin: 16px 0 0; color: #334155;"><em>${footer}</em></p>

        ${
          safeFooterLink
            ? `<p style="margin: 16px 0 0; font-size: 12px; color: #64748b;">Optional: <a href="${safeFooterLink}">I want to receive my balance by SMS/WhatsApp</a></p>`
            : ''
        }

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748b; margin: 0;">GlobalSecure Team</p>
      </div>
    `;
  },

  // GSS-MVP-FIX
  // TODO GSS: i18n key 'card.spentEmail.subject'
  cardSpent: (params: { recipientName?: string; currency: string; spentAmount: string; availableAmount: string; merchantName?: string | null; footerLink?: string }) => {
    const safeName = escapeHtml(params.recipientName || 'Customer');
    const safeCurrency = escapeHtml(params.currency);
    const safeSpent = escapeHtml(params.spentAmount);
    const safeAvailable = escapeHtml(params.availableAmount);
    const safeMerchant = params.merchantName ? escapeHtml(params.merchantName) : null;
    const safeFooterLink = params.footerLink ? escapeHtml(params.footerLink) : null;

    // TODO GSS: i18n key 'card.spentEmail.body.line1'
    const line1 = `You just spent ${safeCurrency} ${safeSpent}.`;
    // TODO GSS: i18n key 'card.spentEmail.body.line2'
    const line2 = `Your new available balance is ${safeCurrency} ${safeAvailable}.`;
    // TODO GSS: i18n key 'card.spentEmail.footer'
    const footer = `When your balance reaches zero, this card will be automatically closed.`;

    return `
      <div style="font-family: sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
        <h2 style="color: #2563eb; margin: 0 0 12px;">GlobalSecure Card Used</h2>
        <p style="margin: 0 0 16px; color: #334155;">Hello, <strong>${safeName}</strong>!</p>

        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>${line1}</strong></p>
          ${safeMerchant ? `<p style="margin: 4px 0; color: #334155;">Merchant: ${safeMerchant}</p>` : ''}
          <p style="margin: 10px 0 0; color: #334155;">${line2}</p>
        </div>

        <p style="margin: 16px 0 0; color: #334155;"><em>${footer}</em></p>

        ${
          safeFooterLink
            ? `<p style="margin: 16px 0 0; font-size: 12px; color: #64748b;">Optional: <a href="${safeFooterLink}">I want to receive my balance by SMS/WhatsApp</a></p>`
            : ''
        }

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748b; margin: 0;">GlobalSecure Team</p>
      </div>
    `;
  }
};
