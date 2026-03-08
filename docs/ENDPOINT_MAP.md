# Mapa de Endpoints (Plataforma)

Este documento lista os endpoints em `src/app/api/**` e serve como referência de integração entre UI (desktop/mobile) e backend.

## Nota importante (UI vs endpoints)

- Um usuário final **não “vê endpoints”**. O que ele vê é a **interface** (páginas, botões, cards).
- A UI (inclusive em mobile) consome endpoints internos via `fetch('/api/...')`.
- Se o usuário “não consegue ver um recurso” no mobile, normalmente a causa é:
  - o recurso está **feature-gated** (`NEXT_PUBLIC_*`), ou
  - a UI não possui “página/section” para esse recurso, ou
  - o endpoint retorna 401/403 por falta de sessão/role, ou
  - dados dependem de integrações externas/flags operacionais.

## Convenções

- **Auth**: a maior parte das rotas protegidas usa `getSession()` ou `withRouteContext(...)`.
- **Admin/Compliance**: rotas em `/api/admin/**` exigem roles via RBAC (`requireRole`).
- **Cron**: rotas em `/api/cron/**` tipicamente exigem segredo (`CRON_SECRET`).
- **Webhooks**: rotas em `/api/webhooks/**` validam assinatura do provedor.
- **Feature flags (UI)**: `NEXT_PUBLIC_TRAVEL_MODE_ENABLED`, `NEXT_PUBLIC_YIELD_UI_ENABLED`.
- **Fees/APY dinâmicos (UI)**: `GET /api/config/fees`.

## Como ler este documento

- A seção **Especificação detalhada (core)** descreve payloads e códigos de erro dos fluxos mais usados.
- A seção **Catálogo (resumo)** lista todos os endpoints com descrição curta e links para os handlers.

## Especificação detalhada (core)

### `GET /api/config/fees`

- Auth: não requerida.
- Objetivo: fornecer parâmetros de fees/FX/APY para UI.
- Response (200):
  - `remittance_fee_percent` (number, 0–100)
  - `fx_spread_percent` (number, 0–100)
  - `yield_apy_percent` (number, 0–100)
  - `last_updated` (ISO string)
  - `source` (`env|db|default`)
  - extras úteis para UI: `transferFeePct`, `transferFeeBps`, `fxSpreadBps`, `yieldUiApyPct`
- Handler: [config/fees/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/config/fees/route.ts)
- Consumido por:
  - Hook: [useFeeConfig.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/hooks/useFeeConfig.ts)
  - UI Transfers: [create/page.tsx](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/dashboard/transfers/create/page.tsx)
  - UI Cards (email): [card-email-dialog.tsx](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/dashboard/cards/components/card-email-dialog.tsx)
  - UI Yield: [YieldClient.tsx](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/dashboard/yield/YieldClient.tsx)

### Travel Mode

#### `GET /api/user/travel-mode`

- Auth: requerida.
- Response (200):
  - `travelModeEnabled` (boolean)
  - `travelRegion` (string|null)
  - `summary` (string)
- Erros: `401 Unauthorized`, `404 User not found`.
- Handler: [user/travel-mode/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/travel-mode/route.ts)

#### `POST /api/user/travel-mode`

- Auth: requerida.
- Request:
  - `enabled` (boolean)
  - `countryCode` (opcional, ISO-3166 alpha-2)
  - compat legado: `travelRegion` (opcional)
- Response (200):
  - `success` (boolean)
  - `travelModeEnabled` (boolean)
  - `travelRegion` (string|null)
  - `summary` (string)
- Erros:
  - `400 Invalid request` (inclui `issues` do zod)
  - `401 Unauthorized`
  - `404 User not found`
- Observação: grava audit log `TRAVEL_MODE_UPDATED`.
- Handler: [user/travel-mode/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/travel-mode/route.ts)

### AML status (visão do usuário)

#### `GET /api/aml/status`

- Auth: requerida.
- Objetivo: status simplificado sem dados sensíveis.
- Response (200):
  - `status`: `VERIFIED | REVIEW | ACTION_REQUIRED | BLOCKED`
  - `has_open_case`: boolean
  - `last_update`: ISO string
- Erros: `401 Unauthorized`, `404 User not found`.
- Handler: [aml/status/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/aml/status/route.ts)
- Consumido por: [AmlStatusCard.tsx](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/components/compliance/AmlStatusCard.tsx)

### Transfers (principais)

#### `POST /api/transfers/internal`

- Auth: requerida (`createHandler` com `requireAuth: true`).
- Rate limit: 5 req/60s (key: `transfer`).
- Request:
  - `toEmail` (email)
  - `amount` (number > 0)
  - `currency` (`EUR|USD|GBP`)
  - `enableYield` (boolean opcional)
- Response (200): `{ success: true, transfer }`
- Bloqueios/erros relevantes:
  - Risco/segurança via `checkUserCanTransact` (ex.: geo-fraud)
  - Jurisdição: `JURISDICTION_NOT_SUPPORTED`
  - Limites KYC: `KYC_LIMIT_TX_EXCEEDED`, `KYC_LIMIT_DAILY_EXCEEDED`, `KYC_LIMIT_MONTHLY_EXCEEDED`
  - Yield kill switch: `YIELD_KILL_SWITCH`
  - Yield exposure limit: `YIELD_EXPOSURE_LIMIT`
- Handler: [transfers/internal/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/transfers/internal/route.ts)
- Chamado por: [transfers/create/page.tsx](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/dashboard/transfers/create/page.tsx)

#### `POST /api/transfers/create`

- Auth: requerida.
- Request (schema):
  - `mode`: `ACCOUNT_CONTROLLED | CARD_EMAIL | SELF_TRANSFER`
  - `amountSource`: number (>= 1)
  - `currencySource`: string(3)
  - `currencyTarget`: string(3)
  - `receiverEmail` (dependendo do modo)
  - `receiverName` (opcional)
  - `personalMessage` (opcional, <= 240)
- Bloqueios/erros relevantes:
  - Risk gate: retorna `{ code, details }` com `status` variando
  - Jurisdição: `JURISDICTION_NOT_SUPPORTED`
  - SCA/Sensitive OTP: `SCA_REQUIRED`, `SENSITIVE_OTP_REQUIRED`, `AUTH_REQUIRED`
  - KYC limits: bloqueios e abertura de AML cases (ex.: `KYC_LEVEL_2_REQUIRED`)
- Handler: [transfers/create/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/transfers/create/route.ts)

## Endpoints de Produto (usuário)

### Auth

- `POST /api/auth/register` — registro de usuário.
  - Handler: [auth/register/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/register/route.ts)
  - Chamado por: tela de registro.
- `POST /api/auth/login-secure` — login.
  - Handler: [auth/login-secure/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/login-secure/route.ts)
  - Chamado por: tela de login.
- `POST /api/auth/logout` — logout.
  - Handler: [auth/logout/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/logout/route.ts)
- `POST /api/auth/refresh` — refresh de sessão/token.
  - Handler: [auth/refresh/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/refresh/route.ts)
- `GET /api/auth/me` — sessão atual.
  - Handler: [auth/me/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/me/route.ts)
- `POST /api/auth/verify-email` — confirmar e-mail.
  - Handler: [auth/verify-email/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/verify-email/route.ts)
- `POST /api/auth/resend-verification` — reenviar verificação.
  - Handler: [auth/resend-verification/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/resend-verification/route.ts)
- `POST /api/auth/forgot-password` — iniciar reset de senha.
  - Handler: [auth/forgot-password/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/forgot-password/route.ts)
- `POST /api/auth/reset-password` — confirmar reset.
  - Handler: [auth/reset-password/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/reset-password/route.ts)

### Segurança

- `POST /api/security/2fa/enable` — solicita OTP para habilitar 2FA.
  - Handler: [security/2fa/enable/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/security/2fa/enable/route.ts)
- `POST /api/security/2fa/verify` — confirma OTP e habilita 2FA.
  - Handler: [security/2fa/verify/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/security/2fa/verify/route.ts)
- `POST /api/security/2fa/disable` — desabilita 2FA.
  - Handler: [security/2fa/disable/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/security/2fa/disable/route.ts)
- `POST /api/security/change-password` — troca de senha.
  - Handler: [security/change-password/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/security/change-password/route.ts)
- `GET /api/security/sessions` — lista sessões.
  - Handler: [security/sessions/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/security/sessions/route.ts)
- `DELETE /api/security/sessions` — encerra sessão.
  - Handler: [security/sessions/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/security/sessions/route.ts)

### Perfil / Preferências

- `PATCH /api/user/profile` — atualiza perfil.
  - Handler: [user/profile/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/profile/route.ts)

### Travel Mode (feature gated)

- `GET /api/user/travel-mode` — estado atual (enabled/region).
  - Handler: [user/travel-mode/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/travel-mode/route.ts)
  - Chamado por: [TravelModeToggle.tsx](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/components/settings/TravelModeToggle.tsx), [TravelModeHeaderIcon.tsx](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/components/dashboard/TravelModeHeaderIcon.tsx), [OperationalBanners.tsx](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/components/incident/OperationalBanners.tsx)
- `POST /api/user/travel-mode` — alterna Travel Mode com `{ enabled, countryCode? }`.
  - Handler: [user/travel-mode/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/travel-mode/route.ts)
- `PATCH /api/user/travel-mode` — compat (payload legado `{ enabled, travelRegion? }`).
  - Handler: [user/travel-mode/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/travel-mode/route.ts)

### Yield (feature gated)

- `GET /api/yield/power` — visão de poder/risco.
  - Handler: [yield/power/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/yield/power/route.ts)
- `GET /api/yield/summary` — resumo de posições.
  - Handler: [yield/summary/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/yield/summary/route.ts)
- `GET /api/user/yield-toggle` — estado do toggle de yield.
  - Handler: [user/yield-toggle/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/yield-toggle/route.ts)
- `POST /api/user/yield-toggle` — alterna yield.
  - Handler: [user/yield-toggle/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/yield-toggle/route.ts)

### Fees/FX (config)

- `GET /api/config/fees` — retorna `remittance_fee_percent`, `fx_spread_percent`, `yield_apy_percent`, `last_updated`, `source`.
  - Handler: [config/fees/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/config/fees/route.ts)
  - Chamado por: `useFeeConfig()` [useFeeConfig.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/hooks/useFeeConfig.ts) e telas de Transfers/Yield/Cards.
- `POST /api/fx/quote` — cotação.
  - Handler: [fx/quote/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/fx/quote/route.ts)
- `POST /api/fx/convert` — conversão.
  - Handler: [fx/convert/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/fx/convert/route.ts)

### Transfers

- `POST /api/transfers/create` — cria transfer (modelo “EXPLICIT/NET”).
  - Handler: [transfers/create/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/transfers/create/route.ts)
- `POST /api/transfers/internal` — cria transfer interno (UI “Create Transfer”).
  - Handler: [transfers/internal/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/transfers/internal/route.ts)
  - Chamado por: [transfers/create/page.tsx](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/dashboard/transfers/create/page.tsx)

### Cards

- `GET /api/cards` — lista cartões.
  - Handler: [cards/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cards/route.ts)
- `POST /api/cards` — cria cartão.
  - Handler: [cards/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cards/route.ts)
- `DELETE /api/cards/:id` — remove cartão.
  - Handler: [cards/[id]/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cards/%5Bid%5D/route.ts)
- `GET /api/cards/:id/reveal` — revela PAN/CVV.
  - Handler: [cards/[id]/reveal/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cards/%5Bid%5D/reveal/route.ts)
- `DELETE /api/cards/:id/cancel` — cancela cartão.
  - Handler: [cards/[id]/cancel/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cards/%5Bid%5D/cancel/route.ts)
- `POST /api/cards/:id/activate` — ativa.
  - Handler: [cards/[id]/activate/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cards/%5Bid%5D/activate/route.ts)
- `POST /api/cards/:id/unlock` — desbloqueia.
  - Handler: [cards/[id]/unlock/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cards/%5Bid%5D/unlock/route.ts)
- `PUT /api/cards/:id/controls` — controles.
  - Handler: [cards/[id]/controls/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cards/%5Bid%5D/controls/route.ts)
- `POST /api/cards/ephemeral-key` — chave efêmera (issuer).
  - Handler: [cards/ephemeral-key/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cards/ephemeral-key/route.ts)

### Card por e-mail (view pública)

- `GET /api/card/email/:token` — dados do cartão via token.
  - Handler: [card/email/[token]/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/card/email/%5Btoken%5D/route.ts)

### Claim (Global Link)

- `POST /api/claim-links` — cria link/claim.
  - Handler: [claim-links/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/claim-links/route.ts)
- `GET /api/claim/:token` — consulta claim.
  - Handler: [claim/[token]/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/claim/%5Btoken%5D/route.ts)
- `POST /api/claim/:token/unlock` — desbloqueia via OTP.
  - Handler: [claim/[token]/unlock/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/claim/%5Btoken%5D/unlock/route.ts)
- `POST /api/claim/by-transfer/:id/unlock` — unlock por transfer.
  - Handler: [claim/by-transfer/[id]/unlock/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/claim/by-transfer/%5Bid%5D/unlock/route.ts)

### KYC / Onboarding

- `PUT /api/onboarding/personal` — dados pessoais.
  - Handler: [onboarding/personal/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/onboarding/personal/route.ts)
- `PUT /api/onboarding/address` — endereço.
  - Handler: [onboarding/address/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/onboarding/address/route.ts)
- `POST /api/onboarding/document` — documento.
  - Handler: [onboarding/document/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/onboarding/document/route.ts)
- `GET /api/kyc/status` — status KYC.
  - Handler: [kyc/status/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/kyc/status/route.ts)
- `GET /api/kyc/document/:id` — download/visualização (protegido).
  - Handler: [kyc/document/[id]/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/kyc/document/%5Bid%5D/route.ts)
- `POST /api/kyc/upload` — upload.
  - Handler: [kyc/upload/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/kyc/upload/route.ts)
- `POST /api/kyc/submit` — submissão manual.
  - Handler: [kyc/submit/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/kyc/submit/route.ts)
- `POST /api/kyc/stripe-identity` — inicia Stripe Identity.
  - Handler: [kyc/stripe-identity/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/kyc/stripe-identity/route.ts)
- `POST /api/kyc/stripe-identity/sync` — sincroniza.
  - Handler: [kyc/stripe-identity/sync/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/kyc/stripe-identity/sync/route.ts)

### Wallet

- `GET /api/wallet/balance` — saldos.
  - Handler: [wallet/balance/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/wallet/balance/route.ts)
- `GET /api/wallet/transactions` — extrato.
  - Handler: [wallet/transactions/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/wallet/transactions/route.ts)
- `GET /api/wallet/transactions/export` — export.
  - Handler: [wallet/transactions/export/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/wallet/transactions/export/route.ts)
- `POST /api/wallet/topup` — topup.
  - Handler: [wallet/topup/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/wallet/topup/route.ts)
- `GET/POST /api/wallet/deposit/pix` — depósito PIX.
  - Handler: [wallet/deposit/pix/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/wallet/deposit/pix/route.ts)
- `GET/POST /api/wallet/deposit/sepa` — depósito SEPA.
  - Handler: [wallet/deposit/sepa/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/wallet/deposit/sepa/route.ts)
- `GET/POST /api/wallet/deposit/bank-br` — depósito bank BR.
  - Handler: [wallet/deposit/bank-br/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/wallet/deposit/bank-br/route.ts)
- `GET /api/wallet/crypto` — visão cripto.
  - Handler: [wallet/crypto/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/wallet/crypto/route.ts)
- `GET /api/wallet/:userId/balance-usdt` — saldo USDT.
  - Handler: [wallet/[userId]/balance-usdt/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/wallet/%5BuserId%5D/balance-usdt/route.ts)
- `POST /api/wallet/:userId/send-usdt` — envio USDT.
  - Handler: [wallet/[userId]/send-usdt/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/wallet/%5BuserId%5D/send-usdt/route.ts)

### Crypto

- `GET /api/crypto/address` — endereço.
  - Handler: [crypto/address/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/crypto/address/route.ts)
- `POST /api/crypto/withdraw` — saque.
  - Handler: [crypto/withdraw/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/crypto/withdraw/route.ts)

### Analytics

- `GET /api/analytics/spend` — agregações de gasto.
  - Handler: [analytics/spend/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/analytics/spend/route.ts)

### Status/Operações

- `GET /api/ops/flags` — flags operacionais (incidentes).
  - Handler: [ops/flags/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/ops/flags/route.ts)
- `GET /api/health` — health básico.
  - Handler: [health/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/health/route.ts)
- `GET /api/db-health` — health DB.
  - Handler: [db-health/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/db-health/route.ts)
- `GET /api/geo` — geolocalização.
  - Handler: [geo/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/geo/route.ts)

### Compliance (visão do usuário)

- `GET /api/aml/status` — status simplificado (`VERIFIED|REVIEW|ACTION_REQUIRED|BLOCKED`).
  - Handler: [aml/status/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/aml/status/route.ts)
  - Chamado por: [AmlStatusCard.tsx](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/components/compliance/AmlStatusCard.tsx)

### Privacy (GDPR)

- `GET/PUT /api/user/privacy/consents` — consulta/atualiza consents.
  - Handler: [user/privacy/consents/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/privacy/consents/route.ts)
- `POST /api/user/privacy/export` — cria export.
  - Handler: [user/privacy/export/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/privacy/export/route.ts)
- `GET /api/user/privacy/export/:id` — baixa export.
  - Handler: [user/privacy/export/[id]/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/privacy/export/%5Bid%5D/route.ts)
- `POST /api/user/privacy/erase` — solicita erase.
  - Handler: [user/privacy/erase/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/privacy/erase/route.ts)
- `GET /api/user/privacy/erase/status` — status erase.
  - Handler: [user/privacy/erase/status/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/privacy/erase/status/route.ts)

## Endpoints Admin/Backoffice

- `GET /api/admin/health` — health admin.
  - Handler: [admin/health/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/health/route.ts)
- `GET /api/admin/logs` — logs.
  - Handler: [admin/logs/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/logs/route.ts)
- `GET /api/admin/users` — lista usuários.
  - Handler: [admin/users/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/users/route.ts)
- `GET /api/admin/finance/users` — finance/users.
  - Handler: [admin/finance/users/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/finance/users/route.ts)
- `POST /api/admin/wallet/topup` — topup manual.
  - Handler: [admin/wallet/topup/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/wallet/topup/route.ts)
- `GET|POST /api/admin/treasury/snapshots` — snapshots.
  - Handler: [admin/treasury/snapshots/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/treasury/snapshots/route.ts)
- `GET /api/admin/treasury/reconciliation/export` — export reconciliação.
  - Handler: [admin/treasury/reconciliation/export/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/treasury/reconciliation/export/route.ts)
- `GET /api/admin/treasury/reconciliation/pdf` — PDF reconciliação.
  - Handler: [admin/treasury/reconciliation/pdf/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/treasury/reconciliation/pdf/route.ts)
- `GET|POST /api/admin/privacy/incidents` — incidentes GDPR.
  - Handler: [admin/privacy/incidents/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/privacy/incidents/route.ts)
- `POST /api/admin/privacy/incidents/:id/notify` — notificar.
  - Handler: [admin/privacy/incidents/[id]/notify/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/privacy/incidents/%5Bid%5D/notify/route.ts)
- `GET /api/admin/noc/events` — eventos NOC.
  - Handler: [admin/noc/events/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/noc/events/route.ts)
- `GET /api/admin/market-guard/run` — executar market guard.
  - Handler: [admin/market-guard/run/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/market-guard/run/route.ts)
- `POST /api/admin/kyc/approve` — aprovar/reprovar.
  - Handler: [admin/kyc/approve/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/kyc/approve/route.ts)
- `POST /api/admin/emergency-reset` — reset de emergência.
  - Handler: [admin/emergency-reset/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/emergency-reset/route.ts)
- `GET|POST /api/admin/aml/review-queue` — fila AML (listar e ações).
  - Handler: [admin/aml/review-queue/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/admin/aml/review-queue/route.ts)

## Cron / Jobs

- `GET /api/cron/process-queue`
  - Handler: [cron/process-queue/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cron/process-queue/route.ts)
- `GET /api/cron/process-recurring`
  - Handler: [cron/process-recurring/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cron/process-recurring/route.ts)
- `GET /api/cron/schedule-finance`
  - Handler: [cron/schedule-finance/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cron/schedule-finance/route.ts)
- `GET /api/cron/schedule-settlement`
  - Handler: [cron/schedule-settlement/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/cron/schedule-settlement/route.ts)

## Webhooks

- `POST /api/webhooks/stripe` — webhook Stripe.
  - Handler: [webhooks/stripe/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/webhooks/stripe/route.ts)
- `POST /api/webhooks/crypto/usdt` — webhook cripto.
  - Handler: [webhooks/crypto/usdt/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/webhooks/crypto/usdt/route.ts)

## Catálogo (resumo)

Esta seção lista os endpoints existentes com descrição curta e link para o handler.

### Config / Operações

- `GET /api/config/fees` — config de fees/FX/APY.
  - Handler: [config/fees/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/config/fees/route.ts)
- `GET /api/ops/flags` — flags operacionais.
  - Handler: [ops/flags/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/ops/flags/route.ts)
- `GET /api/health` — health.
  - Handler: [health/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/health/route.ts)
- `GET /api/db-health` — health DB.
  - Handler: [db-health/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/db-health/route.ts)

### Compliance

- `GET /api/aml/status` — status simplificado AML/KYC.
  - Handler: [aml/status/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/aml/status/route.ts)

### User

- `PATCH /api/user/profile` — update perfil.
  - Handler: [user/profile/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/profile/route.ts)
- `GET|POST|PATCH /api/user/travel-mode` — Travel Mode.
  - Handler: [user/travel-mode/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/travel-mode/route.ts)
- `GET|POST /api/user/yield-toggle` — toggle yield.
  - Handler: [user/yield-toggle/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/user/yield-toggle/route.ts)

### Auth

- `POST /api/auth/register` — registro.
  - Handler: [auth/register/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/register/route.ts)
- `POST /api/auth/login-secure` — login.
  - Handler: [auth/login-secure/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/login-secure/route.ts)
- `POST /api/auth/logout` — logout.
  - Handler: [auth/logout/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/logout/route.ts)
- `GET /api/auth/me` — sessão atual.
  - Handler: [auth/me/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/me/route.ts)
- `POST /api/auth/refresh` — refresh.
  - Handler: [auth/refresh/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/refresh/route.ts)
- `POST /api/auth/verify-email` — verify email.
  - Handler: [auth/verify-email/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/verify-email/route.ts)
- `POST /api/auth/resend-verification` — resend.
  - Handler: [auth/resend-verification/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/resend-verification/route.ts)
- `POST /api/auth/forgot-password` — forgot.
  - Handler: [auth/forgot-password/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/forgot-password/route.ts)
- `POST /api/auth/reset-password` — reset.
  - Handler: [auth/reset-password/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/auth/reset-password/route.ts)

### Security

- `POST /api/security/2fa/enable` — solicitar OTP 2FA.
  - Handler: [security/2fa/enable/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/security/2fa/enable/route.ts)
- `POST /api/security/2fa/verify` — confirmar OTP 2FA.
  - Handler: [security/2fa/verify/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/security/2fa/verify/route.ts)
- `POST /api/security/2fa/disable` — desabilitar 2FA.
  - Handler: [security/2fa/disable/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/security/2fa/disable/route.ts)
- `POST /api/security/change-password` — change password.
  - Handler: [security/change-password/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/security/change-password/route.ts)
- `GET|DELETE /api/security/sessions` — listar/encerrar sessões.
  - Handler: [security/sessions/route.ts](file:///c:/GlobalSecure2026!/globalsecure_pr_balances/src/app/api/security/sessions/route.ts)

### Cards / Claim / Wallet / KYC / FX

- A plataforma possui endpoints adicionais para Cards, Claim (Global Link), Wallet, KYC e FX.
- Eles estão descritos por seção (acima) e no código em `src/app/api/**`.
