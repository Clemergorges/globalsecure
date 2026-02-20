# Diagrama de Fluxo de Fundos (BR/EU → Stripe → Polygon USDT → Emissor de Cartão → Card/SEPA/PIX)

Este documento descreve o fluxo lógico de fundos e eventos (top-up, conversão, custódia, emissão/uso de cartão e saídas) para fins de auditoria e validação técnica.

## 1) Componentes e fronteiras

- **Cliente (BR/EU)**: usuário final (dashboard/web/app).
- **Plataforma GlobalSecureSend (GSS)**: backend Next.js + Prisma + Postgres; mantém saldo e trilha (`Balance`, `AccountTransaction`, `Transfer`). Ver [schema.prisma](file:///c:/GlobalSecure2026!/globalsecuresend/prisma/schema.prisma#L192-L275).
- **Stripe (Payments)**: entrada via cartão/checkout e webhooks. Ver [stripe webhook](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/webhooks/stripe/route.ts).
- **Polygon (USDT)**: eventos de depósito via webhook/handler dedicado. Ver [usdt webhook](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/webhooks/crypto/usdt/route.ts).
- **Emissor de cartão (Issuing)**: integração atual modelada como Stripe Issuing (com fallback/mock). Ver [stripe.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/lib/services/stripe.ts) e [card.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/lib/services/card.ts).
- **SEPA / PIX (depósito local)**: endpoints existentes para crédito local no ledger interno. Ver [sepa deposit](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/wallet/deposit/sepa/route.ts) e [pix deposit](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/wallet/deposit/pix/route.ts).

## 2) Fluxo alto nível (Mermaid)

```mermaid
flowchart LR
  U[Cliente BR/EU] -->|Top-up Card| STRIPE[Stripe Payments]
  STRIPE -->|Webhook: checkout.session.completed| GSS_API[API Webhooks (GSS)]
  GSS_API -->|Crédito no ledger interno| LEDGER[(Postgres + Prisma\nBalance/AccountTransaction)]

  U -->|Depósito USDT (Polygon)| POLY[Polygon USDT]
  POLY -->|Webhook/Evento de depósito| GSS_CRYPTO[API Webhooks Crypto (GSS)]
  GSS_CRYPTO -->|Crédito/registro no ledger| LEDGER

  LEDGER -->|Funding / criação de cartão| ISSUER[Emissor (Stripe Issuing)]
  ISSUER -->|Cartão virtual| CARD[Cartão]

  CARD -->|Uso em comércio| MERCHANT[Comerciante]
  MERCHANT -->|Autorização/Captura| ISSUER
  ISSUER -->|Webhook/updates (se configurado)| GSS_API
  GSS_API -->|Débito/fees no ledger| LEDGER

  U -->|Depósito SEPA (EUR)| SEPA[SEPA]
  SEPA -->|API wallet/deposit/sepa| GSS_SEPA[API Depósito SEPA (GSS)]
  GSS_SEPA -->|Crédito no ledger| LEDGER

  U -->|Depósito PIX (BRL)| PIX[PIX]
  PIX -->|API wallet/deposit/pix| GSS_PIX[API Depósito PIX (GSS)]
  GSS_PIX -->|Crédito no ledger| LEDGER
```

## 3) Fluxos detalhados (auditáveis)

### 3.1 Cartão (EU/BR) → Stripe → Ledger interno (EUR)
- **Objetivo**: entrada de fundos via Stripe com consistência e idempotência.
- **Evento fonte**: `checkout.session.completed` (Stripe).
- **Evidência técnica**:
  - Handler de webhook: [webhooks/stripe/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/webhooks/stripe/route.ts)
  - Lançamentos no ledger interno: modelos `Balance` e `AccountTransaction` em [schema.prisma](file:///c:/GlobalSecure2026!/globalsecuresend/prisma/schema.prisma#L212-L241)
- **Saída esperada**:
  - Crédito na moeda correta (ex.: EUR) em `Balance`.
  - Registro de trilha em `AccountTransaction` (type `DEPOSIT`/`FEE` quando aplicável).

### 3.2 Depósito USDT (Polygon) → Ledger interno (registro/credito)
- **Objetivo**: aceitar eventos de depósito USDT e refletir em saldo interno de forma idempotente.
- **Evidência técnica**:
  - Handler: [webhooks/crypto/usdt/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/webhooks/crypto/usdt/route.ts)
- **Saída esperada**:
  - Registro do evento (tx hash / idempotência) e crédito correspondente no ledger interno, conforme o desenho implementado.

### 3.3 Ledger interno → Emissor de cartão (Issuing) → Uso do cartão
- **Objetivo**: emissão/gestão de cartão e consumo com reflexo contábil.
- **Evidência técnica (modelo atual)**:
  - Funções de emissão/controle: [stripe.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/lib/services/stripe.ts)
  - Consulta de dados do cartão (com fallback/mock): [card.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/lib/services/card.ts)
- **Observação importante**:
  - A emissão “real” está parcialmente mockada (quando `STRIPE_SECRET_KEY` não está configurada) e algumas funções lançam `Not implemented`. Isso impacta a evidência de “emissor” em ambientes sem chaves reais.

### 3.4 Depósito SEPA (EUR) → Ledger interno
- **Objetivo**: crédito EUR para clientes UE com trilha e regra de elegibilidade por país.
- **Evidência técnica**:
  - Endpoint e regra UE: [wallet/deposit/sepa/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/wallet/deposit/sepa/route.ts)
- **Saída esperada**:
  - Crédito EUR em `Balance` e lançamento em `AccountTransaction` (`DEPOSIT`, e `FEE` se `instant`).

### 3.5 Depósito PIX (BRL) → Ledger interno
- **Objetivo**: crédito BRL via PIX no saldo interno e trilha de transação.
- **Evidência técnica**:
  - Endpoint: [wallet/deposit/pix/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/wallet/deposit/pix/route.ts)
- **Saída esperada**:
  - Crédito BRL em `Balance`, lançamento em `AccountTransaction` (`DEPOSIT`) e `UserTransaction` (`PIX_IN`).

## 4) Pontos de atenção (conformidade e auditoria)

- **Segregação de fundos (MiCA)**: o fluxo acima descreve movimentação lógica, mas não comprova segregação formal entre contas de clientes, operacionais e custódia (exige “books/contas segregadas” + reconciliação diária).
- **Reconciliação diária**:
  - Stripe: conciliar eventos (captura/chargeback) com `AccountTransaction`.
  - Polygon: conciliar txHash/confirmations com registros internos.
- **Evidência operacional**: usar `jest-results.json` + [SECURITY_TEST_REPORT.md](file:///c:/GlobalSecure2026!/globalsecuresend/docs/SECURITY_TEST_REPORT.md) como material de reunião, anexando logs/prints quando necessário.

