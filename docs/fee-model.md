# Fee Model (GSS)

## Objetivo

Garantir transparência de fees e consistência entre:

- o valor debitado no ledger (`FiatBalance`);
- os registros de `Transfer` e `AccountTransaction`;
- o que o usuário vê no breakdown da UI.

## Modelos suportados (feature flag)

A rota `/api/transfers/create` suporta dois modelos, controlados por `FEE_MODEL_TRANSFERS_CREATE`:

- `EXPLICIT`: o usuário paga `amountSource + fee`; o recebedor recebe `amountSource` (após FX).
- `NET`: o usuário paga `amountSource`; a fee é deduzida antes do FX (recebedor recebe `amountSource - fee` após FX).

Padrão:

- `EXPLICIT` em `development`/`production`
- `NET` em `test` (para manter compatibilidade com a suíte de testes existente)

## Regras de cálculo

Constantes:

- Fee padrão: `1.8%`
- FX rate: `rateApplied` do motor de FX (inclui spread)

### 1) EXPLICIT

- `fee = amountSource * 0.018`
- `totalToPay = amountSource + fee`
- `amountReceived = amountSource * rateApplied`

### 2) NET

- `fee = amountSource * 0.018`
- `totalToPay = amountSource`
- `amountReceived = (amountSource - fee) * rateApplied`

## UI (breakdown)

O breakdown deve mostrar, no mínimo:

- Valor enviado (principal)
- Taxa GSS
- Total a pagar (quando `EXPLICIT`)
- Valor recebido (após FX)
- FX rate (se houver conversão)

## Compliance (disclaimer fiscal)

Impostos e obrigações fiscais são responsabilidade do usuário. A GSS oferece extratos e relatórios para facilitar a declaração, mas não substitui contador nem consultoria fiscal.

