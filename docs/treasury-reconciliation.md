# Treasury Reconciliation (Proof of Reserves)

## Objetivo

Manter o lastro operacional sob controle comparando o ledger interno (`SUM(FiatBalance)` por moeda) com snapshots externos por provedor (EMI/Stripe/Polygon/Ether.fi etc.), gerando evidências auditáveis (CSV/PDF) e alertas em `AuditLog` quando houver divergência relevante.

## Dados (Prisma)

- `TreasurySnapshot` (`treasury_snapshots`): saldo observado por provedor+moeda em um instante (`capturedAt`).
- `TreasuryLimit` (`treasury_limits`): limites e thresholds usados no módulo de “low balance”; o módulo de reconciliação usa thresholds próprios via env.

## Fluxo Operacional

1) Operações inserem snapshots externos:

- `POST /api/admin/treasury/snapshots` (admin) para ingestão manual/automação.

2) Reconciliation job roda periodicamente:

- `GET /api/cron/schedule-finance` agenda `Job.type = TREASURY_RECONCILE` (respeitando `TREASURY_RECONCILE_MIN_INTERVAL_MINUTES`).
- `GET /api/cron/process-queue` executa o job e chama `runTreasuryReconciliation()`.

3) Evidência auditável (admin):

- CSV: `GET /api/admin/treasury/reconciliation/export`
- PDF: `GET /api/admin/treasury/reconciliation/pdf`

## Regras de Reconciliação

- Interno: `SUM(FiatBalance.amount)` por `currency`.
- Externo: soma do snapshot mais recente por `provider+currency` dentro de `TREASURY_SNAPSHOT_MAX_AGE_MIN`.
- Divergência: `abs(internal - external) / external * 100`.

## Alertas (AuditLog)

- `TREASURY_RECONCILIATION_DIVERGENCE`:
  - `status = WARNING` se `divergencePct >= TREASURY_DIVERGENCE_WARN_PCT`
  - `status = CRITICAL` se `divergencePct >= TREASURY_DIVERGENCE_CRIT_PCT`
  - `metadata.severity = HIGH`
- `TREASURY_RECONCILIATION_MISSING`:
  - `status = WARNING` quando não há snapshots externos recentes para uma moeda com saldo interno > 0.

## Variáveis de Ambiente

- `TREASURY_SNAPSHOT_MAX_AGE_MIN`
- `TREASURY_DIVERGENCE_WARN_PCT`
- `TREASURY_DIVERGENCE_CRIT_PCT`
- `TREASURY_RECONCILE_MIN_INTERVAL_MINUTES`
- `TREASURY_RECONCILE_EMIT_AUDIT`

