# Deploy no Vercel com Domínio Customizado

Este guia é focado no app em `globalsecure_main`.

## 1) Variáveis de ambiente (Vercel)

Configure no Vercel (Production e Preview). Não comite segredos no Git.

```bash
NODE_ENV=production

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# URL canônica
NEXT_PUBLIC_APP_URL=https://www.globalsecuresend.com
# (opcional) manter igual ao canônico ou remover
APP_BASE_URL=https://www.globalsecuresend.com

# Auth/Security
JWT_SECRET=GERAR_UM_SEGREDO_FORTE
OTP_PEPPER=GERAR_UM_SEGREDO_FORTE
SENSITIVE_OTP_PEPPER=GERAR_UM_SEGREDO_FORTE
CRON_SECRET=GERAR_UM_SEGREDO_FORTE

# Supabase (server-side)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Stripe (server-side)
STRIPE_SECRET_KEY=sk_test_... ou sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SMTP)
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=465
SMTP_USER=usuario
SMTP_PASS=senha
SMTP_FROM=onboarding@seudominio.com
EMAIL_FROM=no-reply@seudominio.com

# (opcional) Sentry
SENTRY_DSN=https://...
```

## 2) Domínios e DNS

### Domínio canônico recomendado

- Produção: `https://www.globalsecuresend.com`
- Configure no Vercel um redirect 308 do apex `globalsecuresend.com` → `www.globalsecuresend.com`.

### Registros DNS

- Para subdomínio `www`:
  - Tipo: CNAME
  - Nome: `www`
  - Valor: `cname.vercel-dns.com`

- Para domínio raiz (apex):
  - Use o IP recomendado em **Vercel → Settings → Domains** (não use IP hardcoded antigo).

## 3) SSL

- O Vercel emite SSL automaticamente.
- Se o seu domínio tiver registros **CAA**, inclua um CAA permitindo emissão por Let's Encrypt, senão o certificado pode ficar preso em `Pending`.

## 4) Validação rápida

```bash
curl -I https://www.globalsecuresend.com/api/health
```

Se o login “parecer instável”, verifique se você não está alternando entre apex e www (cookie de sessão é host-only) e se não há 500 por falha de DB.
