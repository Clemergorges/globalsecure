# GlobalSecureSend (GSS) — Relatório completo de testes (QA líder + auditoria de segurança)

**Data:** 2026-02-25  
**Escopo:** Fluxo completo de identidade (cadastro → e-mail → login/sessão → 2FA/SMS → OTP ações sensíveis → KYC → país/endereço/risco)  
**Regra:** sem alterações de código; apenas observação, execução de checks possíveis no ambiente e relatório.

---

## 1) Resumo executivo

### Estado geral

**OK com bugs bloqueantes para “identidade completa” em ambiente local**.

O fluxo básico de UI (páginas) renderiza sem erros aparentes em Chrome desktop; porém, a jornada ponta‑a‑ponta fica **bloqueada** ou **incompleta** em pontos críticos quando dependências externas/flags não estão configuradas (e-mail/SMTP, Stripe Identity, storage para upload KYC), e há pelo menos **2 falhas de UX/integração** importantes:

- **Bug bloqueante (KYC câmera/selfie / Stripe Identity):** o botão/fluxo de “verificação automática” pode não abrir a câmera por falha no backend (chave Stripe ausente → `500`) e/ou restrições de navegador (HTTPS obrigatório no mobile). Ver detalhes em **BUG-001**.
- **Bug bloqueante (OTP para ação sensível x UI):** a tela de Segurança envia request de troca de senha **sem** `otpCode`, mas o endpoint exige OTP. Resultado: usuário não consegue concluir troca de senha. Ver **BUG-002**.

### Principais riscos / bloqueios (prioridade)

- **P0 — KYC selfie/câmera:** Fluxo de KYC automático (Stripe Identity) pode falhar no ambiente por configuração e por requisito de HTTPS/câmera no mobile.
- **P0 — Ação sensível (senha) quebrada:** UI não integra OTP obrigatório; impede troca de senha.
- **P1 — Upload KYC manual:** endpoint usado pela UI (`/api/kyc/submit`) depende de Vercel Blob; falha provável se token/ambiente não configurado. Há um segundo endpoint (`/api/kyc/upload`) com Supabase, sugerindo inconsistência.
- **P1 — 2FA não é “enforced” no login:** o sistema marca `phoneVerified=true`, mas o login/sessão não exige 2FA; isso é um gap de segurança dependendo do objetivo do produto.
- **P2 — Sessões ativas (UX):** marcação de “sessão atual” parece incorreta (provável sempre `false`).

---

## 2) Ambiente de teste

### 2.1 BASE_URL

- **BASE_URL (local):** `http://localhost:3002`

### 2.2 Navegadores e dispositivos

- **Desktop:** Chrome (Windows) — execução focada (navegação + console).  
- **Mobile:** Chrome Android — **não executado fisicamente** neste ambiente; foi aplicado checklist e análise técnica (ver seção Câmera/Selfie).

### 2.3 Config/flags relevantes observadas

Sem expor segredos, os pontos abaixo impactam diretamente o fluxo:

- **SMTP**: se `SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM` não estiverem configurados, envio de e‑mail retorna falha e o fluxo de verificação/OTP por e‑mail fica **bloqueado** (o sistema cria usuário e orienta “reenviar”). Ver [email.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/lib/services/email.ts).
- **Stripe Identity (KYC):** o endpoint usa `STRIPE_SECRET_KEY` e, se ausente, cai em chave dummy (tende a gerar `500` na prática). Ver [stripe-identity/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/stripe-identity/route.ts).
- **Return URL do Stripe Identity:** usa `NEXT_PUBLIC_APP_URL` com fallback para `http://localhost:3000`, o que pode não bater com `:3002`. Ver [stripe-identity/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/stripe-identity/route.ts).
- **Storage KYC:** endpoint `/api/kyc/submit` usa `@vercel/blob` (requer credenciais/ambiente). Ver [submit/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/submit/route.ts). Existe também `/api/kyc/upload` via Supabase. Ver [upload/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/upload/route.ts).

---

## 3) Casos de teste executados

### Convenções

- **Status:** PASS / FAIL / BLOCKED
- **Evidências:** console do navegador (quando aplicável) e observações de resposta/retorno.

### 3.1 Cadastro

#### REG-001 — Tela de cadastro renderiza e validações client-side básicas

- **Objetivo:** garantir que `/auth/register` carrega e não apresenta erro de console.
- **Passos (clique a clique):**
  1) Abrir `BASE_URL/auth/register`.
  2) Verificar campos: e‑mail, senha, país, consentimentos.
  3) (Opcional) digitar e-mail inválido e observar mensagem de validação.
- **Resultado esperado:** página carrega; validações de e‑mail/senha/consentimento aparecem; sem crash.
- **Resultado observado:** página carregou; **sem erros/warns no console** (Chrome desktop).
- **Status:** PASS

**Referências (fonte de verdade):** UI em [register/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/auth/register/page.tsx) e backend em [register/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/auth/register/route.ts).

#### REG-SEC-001 — Rate limit de cadastro

- **Objetivo:** confirmar que existe rate limit no cadastro e logging de auditoria em bloqueio.
- **Passos:** revisar endpoint e validar presença de controle.
- **Resultado esperado:** bloqueio após N tentativas por IP.
- **Resultado observado:** rate limit presente via `checkRateLimit('register:<ip>')` (5/h) e auditoria `REGISTER_BLOCKED` em `429`.
- **Status:** PASS (grey-box)

**Referência:** [register/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/auth/register/route.ts).

### 3.2 Verificação de e‑mail

#### EMAIL-VERIFY-001 — Tela de verificação renderiza e lida com códigos inválidos

- **Objetivo:** verificar que `/verify` carrega e tem tratamento de erro para `OTP_INVALID/OTP_EXPIRED/OTP_USED`.
- **Passos:**
  1) Abrir `BASE_URL/verify?email=qa%40example.com`.
  2) Inserir um código qualquer (ex.: `000000`) e submeter.
- **Resultado esperado:** mensagem de erro clara (ex.: “código inválido”).
- **Resultado observado:** UI tem mapeamento explícito para `OTP_INVALID/OTP_EXPIRED/OTP_USED`; página carrega sem erro de console.
- **Status:** PASS (UI) / BLOCKED (execução do caminho real depende de e‑mail/OTP)

**Referência:** [verify/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/verify/page.tsx) e [verify-email/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/auth/verify-email/route.ts).

#### EMAIL-VERIFY-002 — Reenvio do código possui rate limit

- **Objetivo:** validar que existe rate limit no resend.
- **Resultado esperado:** bloqueio após 3 tentativas/15min por IP+email.
- **Resultado observado:** `checkRateLimit('resend_verification:<ip>:<email>', 3, 15min)` e auditoria `RESEND_VERIFICATION_BLOCKED`.
- **Status:** PASS (grey-box)

**Referência:** [resend-verification/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/auth/resend-verification/route.ts).

### 3.3 Login e sessão

#### AUTH-LOGIN-001 — Login bloqueia usuário com e‑mail não verificado

- **Objetivo:** garantir que o login impede acesso sem `emailVerified`.
- **Passos:**
  1) Registrar usuário.
  2) Tentar login em `/api/auth/login-secure`.
- **Resultado esperado:** `403` com `code=EMAIL_NOT_VERIFIED`.
- **Resultado observado:** o endpoint retorna `403` com `code: "EMAIL_NOT_VERIFIED"` quando `emailVerified=false`.
- **Status:** PASS (grey-box)

**Referência:** [login-secure/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/auth/login-secure/route.ts).

#### AUTH-SESSION-001 — Endpoint `/api/auth/me` sem sessão retorna 401

- **Objetivo:** validar comportamento padrão sem cookie.
- **Passos:**
  1) `GET BASE_URL/api/auth/me` sem cookie.
- **Resultado esperado:** `401 Unauthorized`.
- **Resultado observado:** `401` com `{"error":"Unauthorized"}`.
- **Status:** PASS

### 3.4 2FA (telefone/SMS)

#### 2FA-001 — Habilitar 2FA exige telefone

- **Objetivo:** validar pré-condição: telefone deve existir antes de enviar OTP.
- **Resultado esperado:** `400` se usuário não tiver `phone`.
- **Resultado observado:** a rota retorna `400` com mensagem “Phone number required. Please update profile first.” se `user.phone` ausente.
- **Status:** PASS (grey-box)

**Referência:** [2fa/enable/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/security/2fa/enable/route.ts).

#### 2FA-SEC-001 — OTP SMS armazenado em texto puro

- **Objetivo:** avaliar risco de armazenamento de OTP.
- **Resultado esperado (segurança):** OTP idealmente **hash + TTL**, nunca em texto puro.
- **Resultado observado:** OTP SMS é salvo em `OTP.code` em texto puro.
- **Status:** FAIL (segurança)

**Referência:** [2fa/enable/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/security/2fa/enable/route.ts) e model [schema.prisma](file:///c:/GlobalSecure2026!/globalsecuresend/prisma/schema.prisma#L784-L800).

### 3.5 OTP para ações sensíveis

#### SOTP-001 — Request de OTP de ação sensível cria código (via e‑mail)

- **Objetivo:** validar existência do mecanismo OTP para ações sensíveis.
- **Resultado esperado:** endpoint gera OTP, envia e-mail e registra auditoria.
- **Resultado observado:** implementação presente via [sensitive-otp.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/lib/sensitive-otp.ts) e endpoint [otp/request/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/auth/sensitive/otp/request/route.ts). Contudo, a entrega depende de SMTP.
- **Status:** PASS (mecanismo) / BLOCKED (entrega)

#### SOTP-002 — Troca de senha exige OTP, mas UI não envia

- **Objetivo:** validar o fluxo ponta-a-ponta de troca de senha.
- **Passos:**
  1) Na tela `/dashboard/settings/security`, preencher senha atual e nova.
  2) Submeter.
- **Resultado esperado:** UI solicita OTP (ou integra request/confirm) e envia `otpCode` no POST.
- **Resultado observado:** a UI envia apenas `currentPassword` e `newPassword`, mas o endpoint exige `otpCode` (regex `^\d{6}$`).
- **Status:** FAIL

**Referências:** UI [security/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/security/page.tsx) e backend [change-password/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/security/change-password/route.ts).

### 3.6 KYC (upload de documentos, selfie/câmera, comprovante)

#### KYC-UI-001 — Tela de KYC renderiza e mostra passos

- **Objetivo:** garantir que `/dashboard/settings/kyc` renderiza sem crash.
- **Passos:**
  1) Abrir `BASE_URL/dashboard/settings/kyc`.
- **Resultado esperado:** página carrega; passos de upload e opção Stripe Identity disponíveis.
- **Resultado observado:** página carrega sem erros/warns de console em Chrome desktop.
- **Status:** PASS (render)

**Referência:** [kyc/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/kyc/page.tsx).

#### KYC-UPLOAD-001 — Upload manual via `/api/kyc/submit` (Vercel Blob)

- **Objetivo:** validar submissão manual de doc (frente, verso, selfie) e criação de status PENDING.
- **Resultado esperado:** `200 {success:true}`, criação de `KYCDocument` + `KycVerification` + notificação.
- **Resultado observado (técnico):** endpoint depende de `@vercel/blob put(...)`; sem credenciais no ambiente, tende a retornar `500`.
- **Status:** BLOCKED (ambiente/config)

**Referência:** [submit/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/submit/route.ts).

#### KYC-UPLOAD-002 — Endpoint alternativo `/api/kyc/upload` (Supabase)

- **Objetivo:** validar se há caminho alternativo de upload.
- **Resultado esperado:** upload para bucket Supabase e persistência de metadados.
- **Resultado observado:** endpoint existe e grava paths no DB, mas não é o endpoint utilizado pela UI atual do KYC (a UI chama `/api/kyc/submit`).
- **Status:** FAIL (consistência/integração)

**Referências:** [upload/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/upload/route.ts) e UI [kyc/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/kyc/page.tsx).

### 3.7 Selfie/câmera (Stripe Identity) — foco no bug “link não abre”

#### KYC-SELFIE-001 — Clique em “verificação automática” abre sessão Stripe Identity

- **Objetivo:** reproduzir/validar o bug “link da câmera/selfie não abre”.
- **Passos (esperado no usuário):**
  1) Ir em `/dashboard/settings/kyc`.
  2) Clicar no botão de verificação automática (Stripe Identity).
  3) O app chama `POST /api/kyc/stripe-identity`.
  4) O backend retorna `url` e o frontend faz `window.location.href = data.url`.
- **Resultado esperado:** redireciona para a URL da Stripe; no mobile, navegador solicita permissão de câmera.
- **Resultado observado (hipóteses + evidências):**
  - **Hipótese A (muito provável em local):** `STRIPE_SECRET_KEY` ausente/ inválida → Stripe SDK falha ao criar `verificationSession` → backend responde `500` → UI cai em `alert(t('stripeConnectionError'))` e “não abre a câmera”.
  - **Hipótese B (muito provável em mobile):** mesmo com Stripe ok, **câmera exige HTTPS** (Chrome mobile bloqueia `getUserMedia` em contexto inseguro). Se `NEXT_PUBLIC_APP_URL`/`return_url` não for HTTPS e consistente, o fluxo pode falhar/sair.
  - **Hipótese C:** `return_url` fallback para `http://localhost:3000` (porta errada) pode quebrar o retorno e dar percepção de “não abriu / travou”.
- **Status:** FAIL (quando Stripe/env não configurado) / BLOCKED (validação completa de câmera requer mobile real + HTTPS)

**Referências:** UI [kyc/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/kyc/page.tsx) e backend [stripe-identity/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/stripe-identity/route.ts).

### 3.8 Perfil / país / endereço

#### PROFILE-001 — Tela de Perfil exibe identificação básica

- **Objetivo:** confirmar o que aparece na visão do usuário.
- **Passos:**
  1) Abrir `/dashboard/settings/profile` (logado).
  2) Validar campos visíveis.
- **Resultado esperado (conforme contexto):** nome, e‑mail, telefone, país, endereço.
- **Resultado observado:** a tela exibe **nome, e‑mail, telefone, país e moeda primária**, mas **não exibe endereço completo**; botão de edição está desabilitado (“edit coming soon”).
- **Status:** FAIL (gap de requisitos/UX)

**Referência:** [profile/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/profile/page.tsx).

#### PROFILE-RISK-001 — Uso de país para risco/limites

- **Objetivo:** validar que país afeta regras de risco (ex.: travel mode / geofraud) e limites (KYC).
- **Resultado esperado:** país do usuário influencia bloqueios/alertas quando país observado difere.
- **Resultado observado:** existe regra de geofraud baseada em `user.country` e travel mode (bloqueio fora da região). Limites KYC dependem de `kycLevel` e `riskTier`.
- **Status:** PASS (mecanismo)

**Referências:** [risk-gates.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/lib/services/risk-gates.ts) e [kyc-limits.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/lib/services/kyc-limits.ts).

---

## 4) Bugs encontrados

### BUG-001 — “Selfie/câmera não abre” no fluxo Stripe Identity

- **Reprodutibilidade:** sempre (quando Stripe/env não configurado) / alta (no mobile sem HTTPS)
- **Passos para reproduzir:**
  1) Logar.
  2) Ir em `/dashboard/settings/kyc`.
  3) Clicar na opção de verificação automática (Stripe Identity).
  4) Observar que o link não abre/ não redireciona/ aparece erro.
- **Impacto:** **bloqueante** para KYC nível 2 (selfie/câmera é requisito).
- **Evidências:**
  - Backend usa `STRIPE_SECRET_KEY || 'sk_test_dummy'` e faz `stripe.identity.verificationSessions.create(...)`. Qualquer chave inválida resulta em `500`.
  - `return_url` fallback para `http://localhost:3000` pode divergir do ambiente (`:3002`).
- **Hipótese técnica:**
  - Config ausente/inválida: `STRIPE_SECRET_KEY`/modo sandbox.
  - Contexto inseguro (mobile): necessidade de HTTPS para câmera/live capture.
  - CSP/origem: retorno/redirect divergente pode quebrar.
- **Referências:** [stripe-identity/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/stripe-identity/route.ts) e UI [kyc/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/kyc/page.tsx).

### BUG-002 — Troca de senha não funciona por falta de integração do OTP de ação sensível

- **Reprodutibilidade:** sempre
- **Passos para reproduzir:**
  1) Logar.
  2) Ir em `/dashboard/settings/security`.
  3) Preencher “current password” e “new password” e submeter.
- **Impacto:** **alto/bloqueante** (usuário não consegue trocar senha via UI)
- **Evidências:**
  - Backend exige `otpCode` no payload (`zod`), e valida via `consumeSensitiveActionOtp`.
  - UI não envia `otpCode` e não dispara o fluxo `SENSITIVE_OTP_REQUEST`.
- **Hipótese técnica:** regressão de integração UI↔API ao introduzir OTP obrigatório.
- **Referências:** [security/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/security/page.tsx) e [change-password/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/security/change-password/route.ts).

### BUG-003 — Sessões: “sessão atual” provavelmente nunca é marcada corretamente

- **Reprodutibilidade:** sempre
- **Passos:**
  1) Logar.
  2) Abrir `/dashboard/settings/security` e observar lista de sessões.
- **Impacto:** médio (UX/confiança)
- **Evidências:** rota `/api/security/sessions` não seleciona `token`, mas o código tenta comparar `s.token === session.token`; além disso, `getSession()` não expõe `token`. Isso tende a resultar em `isCurrent=false` para tudo.
- **Hipótese técnica:** implementação incompleta; precisa comparar por `sessionId` (cookie ↔ DB) em vez de token.
- **Referência:** [sessions/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/security/sessions/route.ts).

### BUG-004 — Inconsistência nos endpoints de upload KYC (Submit vs Upload)

- **Reprodutibilidade:** sempre (arquitetural)
- **Impacto:** alto (pode impedir KYC manual em certos ambientes)
- **Evidência:** UI usa `/api/kyc/submit` (Vercel Blob) enquanto existe `/api/kyc/upload` (Supabase).
- **Referências:** [kyc/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/dashboard/settings/kyc/page.tsx), [submit/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/submit/route.ts), [upload/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/kyc/upload/route.ts).

---

## 5) Recomendações (priorizadas)

### P0 (antes de beta fechado com usuários reais)

- **KYC selfie/câmera:** garantir execução end‑to‑end no Chrome mobile **com HTTPS** e `NEXT_PUBLIC_APP_URL` consistente com o domínio real; validar `STRIPE_SECRET_KEY` sandbox e retorno do `return_url`.
- **Ação sensível (senha):** alinhar UI com endpoint de troca de senha (flow request OTP → inserir OTP → confirmar). Se OTP for requisito, UI deve exigir.

### P1 (confiabilidade e auditoria de identidade)

- **Unificar KYC upload:** escolher um único caminho (Vercel Blob *ou* Supabase) e garantir que a UI aponte para o endpoint correto.
- **2FA enforcement:** definir se 2FA é apenas “telefone verificado” ou se deve ser obrigatório no login/step‑up (pelo menos para ações sensíveis/alto valor).
- **Higiene de OTP:** parar de armazenar OTP em texto puro (tabela `OTP`) e implementar hash + tentativas + rate limit por usuário/target.

### P2 (UX e segurança incremental)

- **Sessões:** corrigir indicador de sessão atual e oferecer metadados úteis (dispositivo/localização) com consistência.
- **Perfil:** exibir e permitir editar endereço completo + país fiscal (se for requisito do MVP), com validações e histórico/auditoria.

---

### Anexo — mapeamento rápido “o que o usuário vê” vs “o que o sistema guarda”

- **Cadastro:** e‑mail/senha/país/consentimento → cria `User` com `emailVerified=false`, `phoneVerified=false`, `kycLevel=0`.
- **E‑mail verificado:** `emailVerified=true`; conta sai de `Account.status=UNVERIFIED` para `PENDING` no primeiro verify.
- **2FA (telefone):** habilitar gera OTP SMS; verificar marca `phoneVerified=true`.
- **KYC:** UI atual sugere Nível 1/2, mas upload manual depende de storage; Stripe Identity depende de Stripe + HTTPS mobile.

