# Checklist de Produção (Go-live)

Este checklist foca em reduzir risco operacional (compliance, segurança, finanças) e garantir consistência de configuração entre UI/Backend.

Use como referência de deploy em staging e produção.

## 1) Variáveis de ambiente (mínimo para subir)

### Core

- `DATABASE_URL` e `DIRECT_URL`
- `NODE_ENV=production`

Recomendado:

- `NEXT_PUBLIC_APP_URL` (links absolutos em retornos/redirects)
- `BASE_CURRENCY`, `FX_PAIRS`, `FX_MAX_AGE_SECONDS`

### Auth & Segurança

- `JWT_SECRET` (>= 32 chars)
- `OTP_PEPPER` (>= 16 chars)
- `SENSITIVE_OTP_PEPPER` (>= 16 chars)
- `CRON_SECRET` (para `/api/cron/*`)

Recomendado:

- `SESSION_STRICT_UA` (avaliar impacto em mobile: UA muda com updates do app/browser)
- `SCA_BASE_THRESHOLD_EUR` e `SENSITIVE_HIGH_VALUE_TRANSFER_THRESHOLD_EUR` (transferências)

### Feature flags (UI)

- `NEXT_PUBLIC_TRAVEL_MODE_ENABLED` (`true|false`)
- `NEXT_PUBLIC_YIELD_UI_ENABLED` (`true|false`)

Regra operacional:

- Flags devem ser versionadas por ambiente (dev/staging/prod) e ativadas somente após smoke test.

### Fees/FX/Yield (defaults consumidos pela UI)

- `REM_FEE_PERCENT_DEFAULT` (0–100)
- `FX_SPREAD_PERCENT_DEFAULT` (0–100)
- `YIELD_APY_PERCENT_DEFAULT` (0–100)

Observação: existe também `FX_SPREAD_BPS` (em bps) usado por partes do engine; alinhe as duas configurações para evitar divergência.

Recomendação prática:

- Se `FX_SPREAD_BPS=75`, então `FX_SPREAD_PERCENT_DEFAULT=0.75`.

### Integrações externas

- Stripe (KYC): `STRIPE_SECRET_KEY`
- Vercel Blob (uploads): `BLOB_READ_WRITE_TOKEN`
- Supabase (storage privado KYC): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- SMTP (e-mail): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

Recomendado:

- Validar permissões mínimas e rotação de chaves.
- Garantir que logs/audit não imprimem secrets.

## 2) Banco de dados / Prisma

- Aplicar migrações do Prisma em produção (pipeline/CI).
- Confirmar que enums e constraints estão coerentes com o schema.
- Confirmar índices críticos (AML queue, ledger, transfers) em `prisma/schema.prisma`.

Checklist de DB antes de abrir tráfego:

- Rodar health check de DB: `GET /api/db-health`.
- Rodar um query de leitura simples (ex.: listar `User`/`Account`) via rota interna/admin.
- Garantir que o timezone do banco e do runtime é consistente (timestamps em UTC preferencial).

## 3) Segurança (pré-release)

- Cookies/sessões: validar se `SESSION_STRICT_UA` está coerente com o ambiente.
- 2FA: validar fluxo enable/verify/disable.
- Rate-limits: garantir que endpoints sensíveis estejam protegidos (login, OTP, etc.).
- Segredos: garantir que nenhum segredo é logado.

Checklist de segurança aplicado ao mobile:

- Confirmar que fluxos que dependem de e-mail/OTP são utilizáveis em mobile (copy/paste do código).
- Confirmar comportamento de “sessão” em background/foreground (browser móvel pode descartar cookies).
- Confirmar que a UI não depende de endpoints “externos” diretamente (sempre via `/api/*`).

## 4) Compliance / AML

- Validar roles e acesso a `/api/admin/*`.
- Validar que `/api/aml/status` não vaza informações sensíveis.
- Validar SLA e estados de AML review (`PENDING|IN_REVIEW|BLOCKED|CLEARED`).

Checklist de incidentes compliance:

- Revisar flags operacionais (`/api/ops/flags`) e mensagens de banner.
- Confirmar que bloqueios criam audit logs quando necessário.

## 5) Operação / Observabilidade

- Health checks:
  - `GET /api/health`
  - `GET /api/db-health`
- Logs/Auditoria: confirmar retenção e volume.
- Monitoramento: validar integrações (ex.: Sentry) se habilitadas.

Recomendado:

- Definir SLOs (latência p95 e taxa de erro) para:
  - Auth (login/register)
  - Transfers (create/internal)
  - Cards (create/cancel/reveal)
  - KYC (status/submit)
- Confirmar alarmes para:
  - erro de webhook Stripe
  - filas de settlement/finance
  - taxa de erro em FX engine

## 6) Rotinas (Cron / Jobs)

- Confirmar `CRON_SECRET` configurado e protegido.
- Confirmar que os jobs de settlement/finance rodam no intervalo previsto:
  - `SETTLEMENT_ENGINE_ENABLED`, `SETTLEMENT_TIMEOUT_HOURS`, `SETTLEMENT_BATCH_SIZE`
  - `TREASURY_RECONCILE_MIN_INTERVAL_MINUTES`, `TREASURY_RECONCILE_EMIT_AUDIT`

## 7) Consistência UI vs Backend (ponto crítico)

- Fees exibidos em UI vêm de `GET /api/config/fees`.
- Fee de cálculo em serviços deve alinhar com os mesmos defaults/variáveis.
- Se `GET /api/config/fees` falhar, UI usa fallback e marca como estimativa.

Checklist rápido de consistência (antes de ativar tráfego):

- Abrir `/dashboard/transfers/create` e validar:
  - fee % exibido bate com `GET /api/config/fees`.
  - ao enviar uma transfer, o backend registra fee coerente.
- Abrir `/dashboard/cards` e validar diálogo “cartão por e-mail”:
  - fee % e total exibidos batem com o endpoint.
- Se Yield UI estiver ativado:
  - validar APY exibido bate com `GET /api/config/fees`.

## 8) Smoke tests (pós-deploy)

- Login / logout.
- Dashboard overview carrega.
- Cards: listar/criar/cancelar.
- Transfers: criar transfer (sem yield e, se habilitado, com yield).
- KYC: status e upload/submissão.
- Compliance: `/dashboard/limits` mostra status AML (ou oculta se falhar).

Smoke tests com chamadas HTTP (para QA/DevOps):

- `GET /api/health` deve retornar 200.
- `GET /api/db-health` deve retornar 200.
- `GET /api/config/fees` deve retornar 200 e incluir `remittance_fee_percent`, `fx_spread_percent`, `yield_apy_percent`.
- Após login (cookie/session válida):
  - `GET /api/auth/me` retorna 200.
  - `GET /api/user/travel-mode` retorna 200 (se feature estiver ativa na UI, este endpoint precisa funcionar).
  - `GET /api/aml/status` retorna 200.

## 9) Deploy (Vercel) e rollback (procedimento)

Deploy recomendado:

- Staging:
  - aplicar migrations
  - rodar smoke tests
  - ativar flags progressivamente
- Produção:
  - aplicar migrations com janela de mudança
  - validar health checks
  - habilitar tráfego

Rollback recomendado:

- Desativar flags de UI (`NEXT_PUBLIC_*`) para interromper features rapidamente.
- Desabilitar jobs (`SETTLEMENT_ENGINE_ENABLED=false`) se necessário.
- Em caso de migração incompatível, aplicar estratégia de rollback conforme documento interno de SDLC.

