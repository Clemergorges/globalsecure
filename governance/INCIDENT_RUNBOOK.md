# GSS — Incident Runbook (Internal)

Versão: 0.1

Data de criação: 2026-03-12

Data de última revisão: 2026-03-12

Responsável: (preencher)

## Objetivo

Fornecer um checklist executável para responder a incidentes na GSS, com foco em segurança, integridade financeira e disponibilidade.

## Checklist P1 (Crítico)

### 0) Início

- [ ] Declarar incidente como P1.
- [ ] Definir líder do incidente e canal de comunicação.
- [ ] Registrar hora de início e sistemas afetados.

### 1) Coleta de evidências

- [ ] Capturar logs da Vercel no intervalo do incidente (sem expor PII em canais públicos).
- [ ] Consultar `AuditLog` para eventos relacionados.
- [ ] Identificar endpoints e atores (userId, role).

### 2) Contenção imediata

- [ ] Se for webhook: verificar status da validação de assinatura no handler.
- [ ] Se for cron/fila: suspender execução (desabilitar schedule endpoint temporariamente via hotfix) e impedir reprocessamento automático.
- [ ] Se for auth: revogar sessões afetadas e rotacionar secrets expostos.

### 3) Diagnóstico

- [ ] Identificar causa raiz provável (bug, abuso, falha de parceiro, misconfig de env).
- [ ] Confirmar se há impacto financeiro (ledger, balances, transfers, deposits).
- [ ] Confirmar se há impacto de dados (PII/KYC).

### 4) Correção

- [ ] Implementar correção mínima (hotfix) e preparar PR com testes.
- [ ] Validar `npm run typecheck` e `npm run lint`.

### 5) Recuperação

- [ ] Reprocessar com idempotência (novo job) e validar integridade.
- [ ] Monitorar por 24h.

### 6) Encerramento

- [ ] Preencher registro do incidente.
- [ ] Criar ações preventivas e atribuir responsáveis.

## Registro do incidente (template)

ID do incidente: (preencher)

Severidade: P1 / P2 / P3

Data/hora início:

Data/hora detecção:

Data/hora encerramento:

Líder do incidente:

Sistemas afetados:

Impacto:

Dados afetados (PII/KYC/financeiro):

Linha do tempo (resumo):

Causa raiz:

Ações de contenção executadas:

Ações corretivas (o que foi mudado no código/config):

Ações preventivas (roadmap):

Decisão de comunicação/notificação (LGPD/GDPR):

Links relevantes (PRs, tickets, logs):

## Controles técnicos relacionados

- Sessões/JWT: `src/lib/session.ts`
- Webhooks: `src/app/api/webhooks/*`
- Cron/fila: `src/app/api/cron/*`
- Auditoria: `src/lib/logger.ts` + `prisma/schema.prisma`

