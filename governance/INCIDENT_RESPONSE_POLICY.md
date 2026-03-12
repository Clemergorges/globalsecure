# GSS — Incident Response Policy (Internal)

Versão: 0.1

Data de criação: 2026-03-12

Data de última revisão: 2026-03-12

Responsável: (preencher)

## Objetivo

Definir classificação e processo de resposta a incidentes de segurança, disponibilidade e integridade financeira na GSS.

## Escopo

- Incidentes de:
  - vazamento/exposição de dados
  - fraude/abuso e movimentações indevidas
  - falhas em webhooks (Stripe/cripto)
  - falhas em cron/fila e inconsistência de ledger
  - indisponibilidade de APIs críticas

## Classificação

### P1 (Crítico)

Incidente com impacto alto ou risco imediato.

Exemplos específicos para GSS:
- Suspeita de acesso não autorizado (bypass de auth/RBAC) em rotas `src/app/api/**`.
- Webhook de pagamento aceito sem assinatura e gerando crédito indevido.
- Execução duplicada de job sensível (ex.: withdraw) gerando possível perda.
- Vazamento de segredos (ex.: `JWT_SECRET`, `CRON_SECRET`, webhook secrets).

### P2 (Alto)

Incidente com impacto moderado ou degradado.

Exemplos:
- Falhas repetidas no worker de jobs (`Job.status=FAILED`) interrompendo settlement/treasury.
- Falhas intermitentes em serviços externos (Stripe/Supabase/Polygon) com impacto em parte do sistema.

### P3 (Médio/Baixo)

Incidente limitado ou com workaround simples.

Exemplos:
- Erro isolado em endpoint não crítico.
- Atraso de notificações.

## Fluxo de resposta (passo a passo)

### 1) Detecção

- Coletar evidências mínimas:
  - timestamp
  - endpoint/feature afetada
  - `requestId` (quando existir)
  - logs de Vercel e eventos relevantes em `AuditLog`

### 2) Contenção

- Se houver risco ativo (P1):
  - bloquear/limitar tráfego no endpoint afetado (feature flag quando existir; caso contrário, hotfix)
  - revogar sessões (quando aplicável) e rotacionar secrets expostos
  - suspender jobs críticos (se necessário) e impedir reprocessamento automático

### 3) Erradicação

- Corrigir a causa raiz no código.
- Adicionar teste/regra para evitar regressão.

### 4) Recuperação

- Reprocessar operações de forma controlada (novo job, replay idempotente) e validar integridade.
- Monitorar por pelo menos 24h após correção (P1) ou 4h (P2).

### 5) Comunicação

- P1: preparar comunicação para usuários/parceiros conforme exigido (sem prometer controles inexistentes).
- Registrar decisão sobre notificação (LGPD/GDPR) quando houver dados pessoais afetados.

### 6) Pós-incidente

- Preencher o template do runbook e registrar:
  - causa raiz
  - ações corretivas
  - ações preventivas (incluindo melhorias de testes/observabilidade)

## Template e runbook

- Runbook e template de registro: `governance/INCIDENT_RUNBOOK.md`

## Controles técnicos relacionados

- Logs e auditoria: `src/lib/logger.ts` + `prisma/schema.prisma` (`AuditLog`)
- Cron e fila: `src/app/api/cron/process-queue/route.ts`
- Webhooks: `src/app/api/webhooks/stripe/route.ts`, `src/app/api/webhooks/crypto/usdt/route.ts`
- Sessões: `src/lib/session.ts`
- Features operacionais (flags): `src/app/api/ops/flags/route.ts` e `src/lib/services/operational-flags.ts`

## Roadmap / futuro (não implementado como realidade atual)

- Playbooks automatizados (runbooks executáveis) e integração com SIEM.
- Pager/On-call 24/7 com SOC dedicado.

