# Relatório Detalhado de Testes (Mapa de evidências)

Data: 2026-02-28  
Commit: 7bf8fb8943a1b10ed45bd9137859a88c5f83eb6f  
Ambiente: Windows (Trae IDE Sandbox)

## 1) Como reproduzir a validação
- Qualidade de código: `npm run verify:code`
- i18n audit: `npm run i18n:audit`
- Suite completa: `npm run test:all`
- Build produção: `npm run build`

## 2) Evidências por área (arquivos de teste)

### 2.1 i18n
- Placeholder ICU (evita `{{var}}`): [i18n-messages-placeholders.test.ts](../tests/unit/i18n-messages-placeholders.test.ts)

### 2.2 Perfil (PII e consistência por país)
- Telefone E.164 + DDI por país: [user.profile-phone.test.ts](../tests/integration/user.profile-phone.test.ts)
- CEP/código postal por país: [user.profile-postalcode.test.ts](../tests/integration/user.profile-postalcode.test.ts)

### 2.3 KYC / Stripe Identity
- Criação de sessão por país, validação e códigos de erro: [kyc.stripe-identity-country.test.ts](../tests/integration/kyc.stripe-identity-country.test.ts)
- Sincronização explícita (sync endpoint): [kyc.stripe-identity-sync.test.ts](../tests/integration/kyc.stripe-identity-sync.test.ts)
- Auto-sync ao consultar status: [kyc.status-autosync.test.ts](../tests/integration/kyc.status-autosync.test.ts)
- Validação “últimos 4” do documento (regra por país): [kyc-document-last-four.test.ts](../tests/unit/kyc-document-last-four.test.ts)

## 3) Observações de rastreabilidade
- Para endpoints e fluxos citados, use as referências no [TEST_REPORT](./TEST_REPORT.md) e no [SECURITY_TEST_REPORT](./SECURITY_TEST_REPORT.md).
