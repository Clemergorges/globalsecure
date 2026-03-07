/* eslint-disable @typescript-eslint/no-require-imports */
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function mask(value) {
  if (!value) return '';
  const s = String(value);
  if (s.length <= 4) return '****';
  return `${s.slice(0, 2)}****${s.slice(-2)}`;
}

async function main() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || process.env.FROM_EMAIL;

  const to = getArg('--to');
  const subject = getArg('--subject') || 'Teste SMTP - GlobalSecureSend';

  console.log('SMTP_HOST:', host || '(vazio)');
  console.log('SMTP_PORT:', Number.isFinite(port) ? port : '(inválido)');
  console.log('SMTP_USER:', user || '(vazio)');
  console.log('SMTP_PASS:', pass ? `configurada (${pass.length} chars)` : '(vazio)');
  console.log('EMAIL_FROM/FROM_EMAIL:', from || '(vazio)');
  console.log('TO:', to || '(vazio)');

  if (!host || !user || !pass || !from) {
    console.error('ERRO: faltam envs obrigatórias para SMTP (host/user/pass/from).');
    process.exit(1);
  }

  if (!to) {
    console.error('ERRO: informe o destino com --to email@dominio.com');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    requireTLS: port === 587,
  });

  try {
    console.log('Verificando conexão SMTP (verify)...');
    await transporter.verify();
    console.log('SMTP OK');
  } catch (e) {
    console.error('SMTP VERIFY FALHOU');
    console.error(e && e.stack ? e.stack : e);
    process.exit(2);
  }

  try {
    console.log('Enviando email de teste...');
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: `Teste SMTP OK. Host=${host} Port=${port} User=${mask(user)} From=${from}`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Teste SMTP OK</h2>
        <p><strong>Host:</strong> ${host}</p>
        <p><strong>Porta:</strong> ${port}</p>
        <p><strong>Usuário:</strong> ${mask(user)}</p>
        <p><strong>From:</strong> ${from}</p>
      </div>`,
    });
    console.log('EMAIL ENVIADO');
    console.log('messageId:', info && info.messageId ? info.messageId : '(sem messageId)');
  } catch (e) {
    console.error('ENVIO FALHOU');
    console.error(e && e.stack ? e.stack : e);
    process.exit(3);
  } finally {
    transporter.close();
  }
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(99);
});
