# GSS — Monitoring & Observability (Internal)

Versão: 0.1

Data de criação: 2026-03-12

Data de última revisão: 2026-03-12

Responsável: (preencher)

## Objetivo

Descrever o que o sistema pode expor hoje em termos de sinais operacionais (logs, auditoria e falhas), e quais alertas mínimos devem ser configurados posteriormente em uma ferramenta externa.

## Escopo

- Logs do runtime (Vercel) e logger interno.
- Eventos de auditoria (`AuditLog`).
- Webhooks (Stripe/cripto).
- Cron/fila de jobs.
- Eventos KYC/AML relevantes.

## Sinais disponíveis hoje

### Logs de aplicação

- Erros e warnings emitidos pelo backend.
- Logs específicos de cron (`cron.*`) e webhooks.
- Logs de integração (Stripe/cripto) e falhas de parceiros via circuit breaker.

### Auditoria (DB)

- `AuditLog` registra ações e status (ex.: `LOGIN`, `TRANSFER_CREATED`, eventos de segurança e falhas).
- Campos técnicos úteis:
  - `createdAt`, `action`, `status`, `path`, `duration`
  - `userId` quando aplicável

### Saúde

- Endpoints de health:
  - `/api/health`
  - `/api/db-health`

### Cron e jobs

- Jobs no banco (`Job`) com status `PENDING/PROCESSING/COMPLETED/FAILED`.
- Worker executa jobs via endpoint cron.

### KYC/AML

- Gates de risco e decisões administrativas produzem evidência via serviços e audit log.

## Alertas críticos recomendados (configurar em ferramenta externa)

1) Spike de `401/403` em rotas sensíveis (possível brute force/abuso)
- Alvo: `/api/auth/login-secure`, `/api/auth/reset-password`, `/api/transfers/create`

2) Falha de validação de webhook (Stripe/Alchemy)
- Alvo: `/api/webhooks/stripe`, `/api/webhooks/crypto/usdt`
- Sinal: respostas 400/401 e logs `invalid_signature`

3) Jobs `FAILED` acima do baseline
- Alvo: tabela `Job` e logs `cron.job_failed`
- Ação: pausar reprocessamento automático e abrir incidente P2/P1 conforme impacto

4) Divergência/erros em treasury/settlement
- Alvo: jobs `TREASURY_*` e `SETTLEMENT_*` + eventos em `AuditLog`

5) Ações administrativas sensíveis
- Alvo: endpoints `src/app/api/admin/**` (principalmente KYC/AML/logs)

## Como conectar logs (mínimo)

- Exportar logs da Vercel para um provedor de observabilidade (ex.: Datadog/Grafana/Splunk), usando integração nativa ou drain de logs.
- Configurar captura de erros:
  - Sentry está presente via `sentry.*.config.ts`.
- No DB, criar queries/painéis para:
  - taxa de `AuditLog` por `action/status`
  - top endpoints por erro
  - jobs falhando por tipo

## Controles técnicos relacionados

- Logger/audit: `src/lib/logger.ts`, `prisma/schema.prisma` (`AuditLog`)
- Alertas (Slack/e-mail/DB): `src/lib/services/alert.ts`
- Cron/fila: `src/app/api/cron/*` e modelo `Job` em `prisma/schema.prisma`
- Webhooks: `src/app/api/webhooks/*`
- Circuit breaker: `src/lib/services/partner-circuit-breaker.ts`

## Roadmap / futuro (não implementado como realidade atual)

- Dashboards e alertas automatizados com SLAs.
- Correlation IDs padronizados por request e propagação em logs.
- Métricas de latência (p95/p99) por endpoint e rate limiting distribuído.

