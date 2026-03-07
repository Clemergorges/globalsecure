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

async function testEmail() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || process.env.FROM_EMAIL;
  const to = getArg('--to');

  if (!host || !user || !pass || !from) {
    console.error('ERRO: SMTP não configurado (faltam SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM|FROM_EMAIL).');
    process.exit(1);
  }

  if (!to) {
    console.error('ERRO: informe --to email@dominio.com');
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
    await transporter.verify();
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Teste SMTP - GlobalSecureSend',
      text: 'Teste SMTP OK',
      html: '<p>Teste SMTP OK</p>',
    });
    console.log('OK:', info.messageId || '(sem messageId)');
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exit(2);
  } finally {
    transporter.close();
  }
}

testEmail();
