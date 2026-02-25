# Settlement Engine (Transfers PENDING)

## Objetivo

Evitar `Transfer` em `PENDING` indefinidamente, reduzindo passivo operacional e garantindo consistência de ledger e extratos.

## Componentes

- Scheduler: `GET /api/cron/schedule-settlement`
- Worker: `GET /api/cron/process-queue` (processa jobs `SETTLEMENT_SWEEP`)
- Engine: `runSettlementSweep()` em `src/lib/services/settlement-engine.ts`

## Regras

### Auto-settlement (ACCOUNT)

Critério:

- `Transfer.status = PENDING`
- `Transfer.type = ACCOUNT`
- `recipientId` resolvido (ou resolvível por `recipientEmail`)

Efeitos (ACID):

- Credita `FiatBalance` do destinatário em `currencyReceived` por `amountReceived`
- Cria `AccountTransaction` de crédito para o destinatário
- Cria `UserTransaction` para remetente (TRANSFER), destinatário (TRANSFER) e fee (FEE)
- Marca `Transfer` como `COMPLETED` e preenche `completedAt`
- Registra `TransactionLog` tipo `SETTLEMENT_COMPLETED` e `AuditLog`
- Notifica remetente e destinatário (Notification + Pusher)

### Auto-refund (timeout)

Critério:

- `Transfer.status = PENDING`
- `Transfer.createdAt <= now - SETTLEMENT_TIMEOUT_HOURS`

Efeitos (ACID):

- Credita `FiatBalance` do remetente em `currencySent`
- Cria `AccountTransaction` do tipo `REFUND`
- Cria `UserTransaction` do tipo `ADJUSTMENT`
- Marca `Transfer` como `REFUNDED` e preenche `canceledAt`
- Registra `TransactionLog` tipo `SETTLEMENT_REFUND` e `AuditLog`
- Notifica remetente (Notification + Pusher)

## Variáveis de ambiente

- `SETTLEMENT_ENGINE_ENABLED`
- `SETTLEMENT_TIMEOUT_HOURS`
- `SETTLEMENT_BATCH_SIZE`
- `SETTLEMENT_JOB_MIN_INTERVAL_MINUTES`
- `SETTLEMENT_DRY_RUN`

