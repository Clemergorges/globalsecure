# Rollback plan — Identity Flow Fixes (P0/P1)

## Objetivo

Reverter rapidamente as mudanças de KYC/Security/i18n caso staging apresente regressão.

## Rollback por área

### 1) KYC — Stripe Identity

- Reverter arquivos:
  - `src/app/api/kyc/stripe-identity/route.ts`
  - `src/app/dashboard/settings/kyc/page.tsx`
  - chaves em `messages/*`
- Verificação pós-rollback:
  - `/dashboard/settings/kyc` carrega e botão não gera crash

### 2) Troca de senha com OTP

- Reverter arquivos:
  - `src/app/dashboard/settings/security/page.tsx`
  - `src/app/api/security/change-password/route.ts`
  - chaves em `messages/*`
- Verificação pós-rollback:
  - troca de senha volta ao comportamento anterior (se aplicável) ou desabilitar UI

### 3) Sessões

- Reverter arquivos:
  - `src/app/api/security/sessions/route.ts`
  - `src/lib/device.ts`
  - `src/app/dashboard/settings/security/page.tsx`
  - `tests/unit/device.test.ts`
- Verificação pós-rollback:
  - `/dashboard/settings/security` lista sessões sem quebrar

### 4) i18n / locale es

- Reverter arquivos:
  - `src/i18n/request.ts`
  - `messages/es.json`
- Verificação pós-rollback:
  - idioma pt/en/fr/de continua funcionando

