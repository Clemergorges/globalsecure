# GlobalSecureSend — Relatório de Identidade (KYC / 2FA / OTP)

Data: 2026-02-28  
Commit: 7bf8fb8943a1b10ed45bd9137859a88c5f83eb6f  
Escopo: cadastro, sessão, 2FA por SMS, OTP de ação sensível, KYC Stripe Identity e sincronização

## 1) Resumo executivo
- Status geral: APROVADO (baseado em testes automatizados e build)
- Cobertura: unit/integration/e2e/failure passaram e o build de produção passou

## 2) Dependências externas (impactam validação ponta-a-ponta)
Sem expor segredos, o fluxo real depende de:
- SMTP configurado para envio de e-mails: [email.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/lib/services/email.ts)
- Stripe Identity com `STRIPE_SECRET_KEY` e flows opcionais: [stripe-identity route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/stripe-identity/route.ts)
- Storage de upload KYC (conforme endpoint adotado pela UI em staging/produção): [submit route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/submit/route.ts), [upload route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/upload/route.ts)

## 3) Fluxos validados (evidências)

### 3.1 OTP para ações sensíveis (troca de senha)
- UI solicita OTP e só então chama o endpoint de troca de senha:
  - UI: [security/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/security/page.tsx)
  - API: [change-password route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/security/change-password/route.ts)

### 3.2 2FA por SMS (pré-condição de telefone)
- O usuário cadastra telefone no Perfil (DDI fixo por país; número local) e então habilita 2FA:
  - Perfil: [profile/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/profile/page.tsx)
  - Segurança: [security/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/security/page.tsx)
  - Backend valida telefone em E.164 e DDI compatível com o país:
    - [user/profile route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/user/profile/route.ts)
    - teste: [user.profile-phone.test.ts](file:///c:/GlobalSecure2026!/globalsecuresend/tests/integration/user.profile-phone.test.ts)

### 3.3 KYC Stripe Identity (criação, sync e webhook)
- Criação:
  - valida `user.country` e suporte (BR/LU/US/PT/FR/DE): [supported-countries.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/lib/kyc/supported-countries.ts)
  - endpoint: [stripe-identity route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/stripe-identity/route.ts)
  - testes: [kyc.stripe-identity-country.test.ts](file:///c:/GlobalSecure2026!/globalsecuresend/tests/integration/kyc.stripe-identity-country.test.ts)
- Sincronização:
  - auto-sync em `GET /api/kyc/status`: [kyc/status route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/status/route.ts)
  - sync explícito em `POST /api/kyc/stripe-identity/sync`: [stripe-identity sync route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/stripe-identity/sync/route.ts)
  - webhook Identity: [stripe webhook route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/webhooks/stripe/route.ts)
  - testes: [kyc.status-autosync.test.ts](file:///c:/GlobalSecure2026!/globalsecuresend/tests/integration/kyc.status-autosync.test.ts), [kyc.stripe-identity-sync.test.ts](file:///c:/GlobalSecure2026!/globalsecuresend/tests/integration/kyc.stripe-identity-sync.test.ts)

### 3.4 Consistência de dados por país (endereço/CEP e telefone)
- Código postal padronizado por país e validado no backend:
  - API: [user/profile route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/user/profile/route.ts)
  - teste: [user.profile-postalcode.test.ts](file:///c:/GlobalSecure2026!/globalsecuresend/tests/integration/user.profile-postalcode.test.ts)

## 4) Relatórios relacionados
- Consolidado: [docs/TEST_REPORT.md](file:///c:/GlobalSecure2026!/globalsecuresend/docs/TEST_REPORT.md)
- Segurança/Regulatório: [docs/SECURITY_TEST_REPORT.md](file:///c:/GlobalSecure2026!/globalsecuresend/docs/SECURITY_TEST_REPORT.md)
- KYC/Stripe/2FA: [docs/KYC_STRIPE_2FA_REPORT.md](file:///c:/GlobalSecure2026!/globalsecuresend/docs/KYC_STRIPE_2FA_REPORT.md)
