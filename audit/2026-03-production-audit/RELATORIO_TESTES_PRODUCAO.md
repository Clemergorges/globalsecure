# GlobalSecureSend — Relatório de Testes em Produção (Auditoria Completa)

Data: 2026-03-05  
Ambiente: Produção (Vercel + Supabase)  
Domínio: https://www.globalsecuresend.com  

## 1) Resumo executivo

- Status geral: APROVADO (produção operacional e login funcional após correções)
- Resultado principal: conectividade DB via Pooler + migrations aplicadas + endpoints críticos respondendo corretamente
- Restrições (conta gratuita): testes de carga e varreduras agressivas foram evitados para não consumir limites nem causar bloqueios

## 2) Contexto e escopo

Este relatório consolida os testes executados em produção, espelhando o que já havia sido validado localmente (tests/build), porém com foco em:

- Infra/Deploy: garantir que o domínio aponta para o deploy correto e que o runtime está usando as variáveis corretas
- Banco de dados: validar pooler (PgBouncer) em runtime e aplicar migrations pendentes
- Segurança de rotas: validação de 401/403 para endpoints protegidos
- Headers de segurança e comportamento HTTP
- Fluxo de autenticação: validação de códigos e respostas sem revelar informações sensíveis

## 3) Evidências do deploy e do banco

### 3.1 Deploy ativo

Evidência via `GET /api/db-health`:

- `nodeEnv`: production
- `vercel.gitCommitRef`: main
- `vercel.gitCommitSha`: 98ffb034b79265266cb3c2c8ad7c50111284bb6e
- `vercel.deploymentId`: dpl_7yjhRRUADvQPAczrMjb77isqrH56

### 3.2 Conectividade de banco (Pooler + Direct)

Evidência via `GET /api/db-health`:

- `DATABASE_URL` (pooler):
  - host: `aws-1-eu-west-1.pooler.supabase.com`
  - port: `6543`
  - parâmetros: `sslmode=require`, `pgbouncer=true`, `connection_limit=1`
  - `hasSslModeRequire=true`, `hasPgBouncer=true`
- `DIRECT_URL` (direct):
  - host: `db.gvttvtlyxzohqyyrhunu.supabase.co`
  - port: `5432`
  - parâmetros: `sslmode=require`
  - `hasSslModeRequire=true`

Observação: o pooler é necessário para runtime serverless; o direct é necessário para migrations.

### 3.3 Migrations (Prisma)

Evidência via execução local contra o banco de produção (direct 5432):

- `npx prisma migrate deploy`: aplicou todas as migrations pendentes
- `npx prisma migrate status`: “Database schema is up to date!”

Impacto direto: remove o erro `P2022 The column User.role does not exist` que estava causando 500 no login.

## 4) Testes executados em produção (baixo impacto)

### 4.1 Disponibilidade e endpoints públicos

- `GET /` → 200
- `GET /auth/login` → 200
- `GET /api/health` → 200 e corpo JSON esperado (`status=ok`)
- `GET /api/db-health` → 200 e corpo JSON esperado (pooler/direct + metadados Vercel)

### 4.2 Controle de acesso (sem sessão)

Testes realizados sem cookies/sessão para validar proteção:

- `GET /api/auth/me` → 401 com `{ "error": "Unauthorized" }`
- `GET /api/admin/health` → 403 com `{ "error": "Forbidden" }`
- `GET /api/ops/flags` → 401 com `{ "ok": false, "code": "UNAUTHORIZED" }`

### 4.3 Login (resposta segura)

- `POST /api/auth/login-secure` com credenciais inválidas → 401 e `{ "error": "Invalid credentials" }`
- Resultado esperado: não vaza se email existe/não existe (mensagem única)

### 4.4 Rate limit (checagem mínima)

- 7 tentativas rápidas (mesmo IP, mesmo email inexistente) retornaram 401 (sem 429)
- Interpretação:
  - possível que o rate limit esteja configurado com janela maior, chave diferente (por IP+fingerprint), ou atuando apenas para usuário existente
  - recomendação: validar com k6 em staging e/ou com configurações de WAF/CDN (fora do limite free-tier)

### 4.5 2FA (independente de KYC) — atualização de política

Estado desejado (após implantação do ajuste de 2FA):

- `POST /api/security/2fa/enable` não deve bloquear por `kycStatus`
- Erros de regra de negócio devem ser controlados (ex.: falta de telefone → 409 com `code=PHONE_REQUIRED`)
- Falhas inesperadas (DB/env/terceiro) devem retornar 500 com `{ "error": "Internal server error" }` sem vazar detalhes

Checklist de validação em produção (baixo impacto):

- Usuário com `kycStatus=PENDING` e telefone cadastrado:
  - `POST /api/security/2fa/enable` → 200 e inicia envio de OTP
  - `POST /api/security/2fa/verify` com OTP válido → 200 e 2FA habilitada
- Usuário sem telefone cadastrado:
  - `POST /api/security/2fa/enable` → 409 com `code=PHONE_REQUIRED` (sem 500)
  - Logs/audit devem registrar tentativa com `requestId` (sem expor segredo/OTP)

## 5) Headers de segurança observados

### 5.1 Presenças confirmadas

Em `/` e em endpoints `/api/*`:

- `Strict-Transport-Security: max-age=63072000`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### 5.2 Observações (oportunidades de hardening)

- CSP global não observada em `/` e `/auth/login` (apenas rotas específicas possuem CSP no `next.config.ts`)
- `X-Powered-By: Next.js` presente em páginas HTML
- HSTS sem `includeSubDomains` e sem `preload` (não é obrigatório, mas é um hardening comum)

## 6) Achados e recomendações

### 6.1 Achados corrigidos durante a auditoria

- Deploy “Atual” estava servindo build antigo (o domínio respondia código desatualizado) → corrigido via promoção do deploy correto
- Runtime tentando conectar em `:5432` (sem pooler) → corrigido via `DATABASE_URL` no pooler `:6543` com `pgbouncer=true` e `sslmode=require`
- Schema do banco desatualizado (erro `User.role` ausente) → corrigido via `prisma migrate deploy`

### 6.2 Riscos residuais (requer decisão)

- Endpoint `/api/db-health` é público e expõe metadados (host/port/commit/deploymentId). Recomendação: proteger com segredo (header) ou restringir a admin/observabilidade.
- CSP global ausente nas páginas principais. Recomendação: definir CSP para rotas HTML gerais, compatível com Next/Sentry/Stripe.
- Automação de migrations na Vercel não é confiável em free-tier quando `:5432` não é alcançável (P1001). Recomendação: migrations via pipeline controlado (runner com acesso) ou execução manual com checklist.

## 7) Matriz Doc → Evidência (Produção)

Objetivo: registrar quais artefatos são **documentação de referência** vs quais foram **validados com evidência em produção**.

Legenda:

- `PROD`: validado em produção (com evidência neste relatório)
- `LOCAL/CI`: validado localmente/CI (ver relatórios existentes)
- `REF`: documento/política/guia (não é “teste executado”)
- `EXT`: depende de terceiros/tráfego real (Stripe live, SMS, SMTP, webhooks), fora do escopo de baixo impacto/free-tier

| Artefato | Papel | Status | Evidência/observação |
|---|---|---|---|
| `audit/2026-03-production-audit/RELATORIO_TESTES_PRODUCAO.md` | Consolidação auditoria produção | `PROD` | Este documento |
| `SECURITY_TEST_PLAN.md` | Plano-mestre de cenários | `REF` | Usado como checklist de referência |
| `PRE_RELEASE_SECURITY_CHECKLIST.md` | Checklist Go-Live | `REF` | Base operacional, não executado como teste |
| `audit/2026-02-initial-audit/TEST_REPORT.md` | Evidência de suíte local/CI (RC) | `LOCAL/CI` | Pacote de auditoria inicial |
| `audit/2026-02-initial-audit/MANIFEST.md` | Índice do pacote auditoria | `REF` | Metadados do pacote |
| `audit/2026-02-initial-audit/COMPLIANCE.md` | Compliance (versão auditada) | `REF` | Documento, não execução |
| `audit/2026-02-initial-audit/ARCHITECTURE.md` | Arquitetura (versão auditada) | `REF` | Documento, não execução |
| `docs/TEST_REPORT.md` | Suíte local (pré-deploy) | `LOCAL/CI` | Referência para cobertura de testes |
| `docs/SECURITY_TEST_REPORT.md` | Segurança/regulatório (local) | `LOCAL/CI` | Referência para controles validados |
| `GSS-IDENTITY-FLOW-TEST-REPORT.md` | Identidade/KYC/2FA (local) | `LOCAL/CI` | Evidência pré-produção |
| `docs/KYC_STRIPE_2FA_REPORT.md` | Detalhes KYC/Stripe/2FA | `LOCAL/CI` | Depende de credenciais reais para EXT |
| `docs/EMAIL_VERIFICATION_FLOW.md` | Fluxo email/OTP | `EXT` | Requer SMTP em produção para validação completa |
| `docs/EMAIL_TEMPLATE_LIBERACAO_GSS.md` | Template de comunicação | `REF` | Conteúdo, não execução |
| `docs/ARCHITECTURE.md` | Arquitetura (atual) | `REF` | Documento, não execução |
| `docs/COMPLIANCE.md` | Compliance (atual) | `REF` | Documento, não execução |
| `docs/IT_SECURITY_PLAN.md` | Plano de TI/Segurança | `REF` | Documento, não execução |
| `docs/API_REGISTER.md` | Especificação de registro | `REF` | Contrato; fluxo não reexecutado em PROD |
| `docs/COUNTRY_CONFIG.md` | Regras país/moeda | `LOCAL/CI` | Validado por unit tests (pré-deploy) |
| `docs/fee-model.md` | Modelo de fee | `REF` | Requer E2E financeiro para EXT |
| `docs/CLAIM_FLOW.md` | Fluxo Claim | `EXT` | Requer criação/claim/unlock (alto impacto) |
| `docs/ISSUER_TSP_CONTRACT.md` | Contrato emissor/TSP | `REF` | Documento para fase futura |
| `docs/LEGAL_TOGGLE_YIELD_GSS.md` | Texto legal do toggle yield | `REF` | Conteúdo, não execução |
| `docs/I18N_REFERENCE.md` | Convenções i18n | `LOCAL/CI` | Validado por audit/testes unitários |
| `docs/COMANDOS_STAGING.md` | Guia operacional | `PROD` | Seção de migrations executada em PROD |
| `docs/DEMO_SCRIPT.md` | Roteiro demo | `REF` | Não aplicável como teste |
| `docs/PITCH_BULLETS_CLAIM.md` | Texto pitch | `REF` | Não aplicável como teste |
| `docs/FUNDRAISING_PREP.md` | Checklist fundraising | `REF` | Não aplicável como teste |

## 8) Anexo — Evidências técnicas (comandos)

Comandos (execução read-only) usados para evidências em produção:

- `curl.exe -s -D - https://www.globalsecuresend.com/ -o NUL`
- `curl.exe -s -D - https://www.globalsecuresend.com/api/health -o -`
- `curl.exe -s -D - https://www.globalsecuresend.com/api/db-health -o -`
- `curl.exe -s -D - https://www.globalsecuresend.com/api/auth/me -o -`
- `curl.exe -s -D - https://www.globalsecuresend.com/api/admin/health -o -`
- `curl.exe -s -D - https://www.globalsecuresend.com/api/ops/flags -o -`
- `npx prisma migrate deploy` (executado localmente contra o banco de produção)
- `npx prisma migrate status`

