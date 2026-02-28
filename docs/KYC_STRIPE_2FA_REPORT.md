# Relatório KYC / Stripe Identity / 2FA

Data: 2026-02-28  
Commit: 7bf8fb8943a1b10ed45bd9137859a88c5f83eb6f  
Ambiente: Windows (Trae IDE Sandbox)

## 1) Objetivo
Documentar o estado atual do fluxo de identidade com foco em:
- KYC via Stripe Identity (criação, retorno, sincronização e webhook)
- 2FA por SMS (pré-condições e verificação)
- OTP para ações sensíveis (troca de senha)

## 2) KYC (Stripe Identity)

### 2.1 País do usuário como fonte de verdade
- O endpoint de criação usa `user.country` (normalizado) e bloqueia:
  - país ausente (`KYC_COUNTRY_MISSING`)
  - país inválido (`KYC_COUNTRY_INVALID`)
  - país não suportado (`KYC_UNSUPPORTED_COUNTRY`)
- Países suportados: [supported-countries.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/lib/kyc/supported-countries.ts)
- Endpoint: [stripe-identity route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/stripe-identity/route.ts)

### 2.2 Resiliência e códigos de erro
- Feature flag: `KYC_STRIPE_IDENTITY_ENABLED` pode desabilitar criação (503).
- Requer `STRIPE_SECRET_KEY` configurada (caso contrário retorna 503 com `STRIPE_NOT_CONFIGURED`).
- Erros Stripe são mapeados em códigos explícitos (ex.: auth, rate limit, connection) e retornam 502/503 conforme o caso.
- Integração com circuit breaker para Stripe em `identity.verificationSessions.create`.

### 2.3 Return URL em ambiente local
- Em desenvolvimento, se a origem estiver em `localhost` em porta diferente, a return_url é normalizada para `localhost:3000` para evitar retorno quebrado.
- Implementação: [stripe-identity route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/stripe-identity/route.ts)

### 2.4 Persistência e sincronização do status
Persistência inicial:
- Ao iniciar uma sessão, cria `KYCDocument` com `documentType=STRIPE_IDENTITY` e `status=PENDING`.

Sincronização (3 caminhos):
- Webhook Stripe:
  - `identity.verification_session.verified`: marca `KYCDocument=APPROVED` e `User.kycStatus=APPROVED`, `kycLevel=2`
  - `identity.verification_session.requires_input`: marca `KYCDocument=REVIEW` e registra `rejectionReason`
  - Referência: [stripe webhook route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/webhooks/stripe/route.ts)
- Endpoint dedicado de sync (quando a UI informa `sessionId`):
  - `POST /api/kyc/stripe-identity/sync`
  - Referência: [stripe-identity sync route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/stripe-identity/sync/route.ts)
- Auto-sync ao consultar status:
  - `GET /api/kyc/status` tenta sincronizar automaticamente quando usuário/doc estão pendentes
  - Referência: [kyc/status route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/status/route.ts)

## 3) 2FA por SMS

### 3.1 Pré-condição de telefone
- A UI direciona o usuário a cadastrar telefone no Perfil antes de habilitar 2FA por SMS.
- UI: [security/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/security/page.tsx)
- Perfil: [profile/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/profile/page.tsx)
- API de perfil valida telefone em E.164 e DDI compatível com o país do usuário:
  - [user/profile route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/user/profile/route.ts)

### 3.2 Habilitar e verificar
- Habilitar: `POST /api/security/2fa/enable`
- Verificar: `POST /api/security/2fa/verify`
- UI usa diálogo de OTP para confirmar.

## 4) OTP para ações sensíveis (troca de senha)
- UI solicita OTP de ação sensível para `SENSITIVE_CHANGE_PASSWORD` e exige confirmação antes de chamar o endpoint de troca de senha:
  - UI: [security/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/security/page.tsx)
  - Request OTP: `/api/auth/sensitive/otp/request`
  - Change password: [change-password route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/security/change-password/route.ts)

## 5) Evidências (testes)
- País/suporte/erros na criação Stripe Identity: [kyc.stripe-identity-country.test.ts](file:///c:/GlobalSecure2026!/globalsecuresend/tests/integration/kyc.stripe-identity-country.test.ts)
- Sync endpoint (verified -> APPROVED): [kyc.stripe-identity-sync.test.ts](file:///c:/GlobalSecure2026!/globalsecuresend/tests/integration/kyc.stripe-identity-sync.test.ts)
- Auto-sync ao consultar status: [kyc.status-autosync.test.ts](file:///c:/GlobalSecure2026!/globalsecuresend/tests/integration/kyc.status-autosync.test.ts)
- Telefone E.164 + DDI por país: [user.profile-phone.test.ts](file:///c:/GlobalSecure2026!/globalsecuresend/tests/integration/user.profile-phone.test.ts)
