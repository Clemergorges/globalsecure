# GSS — Security Policy (Internal)

Versão: 0.1

Data de criação: 2026-03-12

Data de última revisão: 2026-03-12

Responsável: (preencher)

## Objetivo

Definir como a segurança é tratada na GlobalSecureSend (GSS) hoje, com regras operacionais concretas e ligação direta com os controles técnicos existentes no código.

## Escopo

- Backend (Next.js App Router) e rotas `src/app/api/**`.
- Autenticação/sessão, RBAC, proteção de endpoints sensíveis.
- Webhooks (Stripe e cripto) e endpoints de cron/queue.
- Logging e auditoria (incluindo dados sensíveis).
- Gestão de segredos e variáveis de ambiente.

## Regras operacionais concretas

### Gestão de segredos e variáveis de ambiente

- É proibido commitar segredos no repositório (tokens, chaves privadas, secrets de webhook, `DATABASE_URL`).
- Produção e Preview na Vercel devem possuir as variáveis obrigatórias (ver `.env.example` e README).
- O aplicativo valida variáveis de ambiente no startup (exceto `NODE_ENV=test`/`CI=true`). Falhas de validação devem impedir deploy.

### Autenticação e sessão

- Sessões são mantidas via cookie httpOnly `auth_token`.
- Tokens são assinados com `JWT_SECRET` e validados no backend.
- A sessão efetiva do usuário é verificada contra a tabela de sessões (revogação/expiração).
- A combinação de cookie + verificação no banco é o mecanismo “source of truth” para autenticação.

### Autorização (RBAC)

- O sistema usa papéis (roles) no banco (`UserRole`).
- Endpoints administrativos e ações sensíveis devem exigir role explícita (`ADMIN`, `COMPLIANCE`, `TREASURY`).
- É proibido usar “admin por e-mail” como regra de autorização.

### Endpoints sensíveis, cron e fila

- Endpoints de cron devem exigir `Authorization: Bearer ${CRON_SECRET}`.
- O worker de fila deve claim jobs de forma atômica para evitar double-processing.
- Job com falha deve terminar como `FAILED` e exigir ação humana/novo job para reprocessar (evita loop infinito).

### Webhooks

- Todo webhook externo deve ser verificado por assinatura/secret.
- Webhook sem assinatura deve falhar fechado (`401`/`400`), nunca “pular validação”.
- Logs de webhooks não devem conter payload completo; registrar apenas IDs/txHash truncados.

### Logs e auditoria

- Logs e `AuditLog` são utilizados para rastrear operações sensíveis.
- Não registrar segredos em logs.
- Evitar PII em logs operacionais; quando necessário, usar `userId` e/ou dados minimizados (ex.: domínio do e-mail, últimos 4 dígitos).

### Rate limiting

- A aplicação possui mecanismos de rate limiting e proteção de abuso.
- Rotas sensíveis devem ter limites mais estritos e monitoramento.

## Controles técnicos relacionados

### Gestão de segredos / env

- Validação central de env: `src/lib/env-validation.ts`
- Config de env usada pelo backend: `src/lib/config/env.ts`
- Lista de envs: `.env.example`

### Sessão, JWT e cookies

- Criação/validação/revogação de sessão: `src/lib/session.ts`
- Leitura de sessão em rotas/Server Components: `src/lib/auth.ts`
- Proteção RBAC: `src/lib/rbac.ts`
- Modelo de roles: `prisma/schema.prisma` (enum `UserRole`, campo `User.role`)

### Cron / fila

- Worker de jobs: `src/app/api/cron/process-queue/route.ts`
- Scheduler de finanças: `src/app/api/cron/schedule-finance/route.ts`
- Scheduler de settlement: `src/app/api/cron/schedule-settlement/route.ts`
- Cron recorrências (beta): `src/app/api/cron/process-recurring/route.ts`

### Webhooks

- Stripe webhook: `src/app/api/webhooks/stripe/route.ts`
- Cripto webhook (Alchemy): `src/app/api/webhooks/crypto/usdt/route.ts`

### Endpoints com histórico de risco e hardening

- Emergency reset (operacional, desabilitado por padrão): `src/app/api/admin/emergency-reset/route.ts`
- IDOR mitigado/mascaramento: `src/app/api/wallet/[userId]/balance-usdt/route.ts`

### Logs/auditoria

- Logger e auditoria: `src/lib/logger.ts`
- Modelo `AuditLog`: `prisma/schema.prisma`

### Testes de segurança (existentes)

- Suíte de segurança: `tests/security/**`
- Testes de sessão/conta: `tests/auth/**`, `tests/integration/auth.*`

## Roadmap / futuro (não implementado como realidade atual)

- Habilitar GitHub Code Scanning e regras de branch protection.
- Implementar rate limiting distribuído (Redis/Upstash) para rotas críticas.
- Padronizar redaction de PII/segredos em todos os logs (inclusive audit metadata) e limitar tamanho de metadata.
- Automatizar rotação de segredos e detecção de segredos em CI.

