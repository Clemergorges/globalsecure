# GSS — KYC & AML Policy (Internal)

Versão: 0.1

Data de criação: 2026-03-12

Data de última revisão: 2026-03-12

Responsável: (preencher)

## Objetivo

Descrever como a GSS executa KYC e AML hoje (beta) e quais controles podem ser ativados rapidamente com mudanças pequenas já mapeadas.

## Escopo

- Onboarding e coleta de dados (KYC)
- Gate de transações (KYC/AML)
- Regras AML (limites, países de risco/sanções)
- Regras por jurisdição e por rail (PIX, SEPA, cripto)
- Auditoria de decisões (admin) e eventos relevantes

## Regras operacionais concretas

### Status de KYC

- O usuário possui `kycStatus` no banco.
- Estados usados no sistema:
  - `PENDING`
  - `REVIEW` (quando aplicável)
  - `APPROVED`
  - `REJECTED`
  - `EXPIRED`

Regra operacional:
- Usuário com KYC incompleto deve ter transações bloqueadas ou limitadas conforme gate (ver seção “Gates”).

### Gates KYC/AML (bloqueio de transações)

- O gate central é aplicado via serviço de risco.
- Regra operacional mínima:
  - `REJECTED` ou `EXPIRED` bloqueiam transações.
  - Casos AML com risco `HIGH/CRITICAL` e status pendente bloqueiam transações.

Roadmap/futuro:
- Bloquear também `PENDING/REVIEW` por padrão e permitir apenas exceções de baixo risco/baixo valor conforme definido em produto.

### AML — países sancionados e alto risco

- A aplicação possui listas configuráveis por env para sanções/alto risco.
- Regra operacional:
  - As listas devem ser mantidas e revisadas periodicamente (mensal) e mudanças devem ser registradas em auditoria.

Roadmap/futuro:
- Fail-safe no startup quando listas estiverem vazias em produção.
- Registro de versão e evidência de atualização (auditoria dedicada para configuração AML).

### Regras por jurisdição e rail

- PIX e SEPA são rails distintos e devem respeitar regras de país/moeda e política de risco.
- Depósito cripto depende de webhooks e reverse lookup de address.

Regra operacional:
- Rotas de depósito devem aplicar gates de risco e logs de auditoria adequados.

Roadmap/futuro:
- Tornar depósitos fiat (PIX/SEPA) event-driven (PENDING → webhook PSP → CREDITED) e aplicar idempotência por referência.

### Decisões de KYC por admin

- Decisões administrativas devem registrar:
  - ator (admin)
  - usuário alvo
  - decisão (aprovar/rejeitar)
  - motivo (quando rejeitar)
  - timestamp

Roadmap/futuro:
- Exigir revisão dupla para decisões de risco elevado.

## Controles técnicos relacionados

### KYC

- Registro de usuário e `kycStatus`: `src/app/api/auth/register/route.ts`
- Stripe Identity (início e sync): `src/app/api/kyc/stripe-identity/route.ts`, `src/app/api/kyc/stripe-identity/sync/route.ts`
- Status KYC: `src/app/api/kyc/status/route.ts`
- Decisão admin (aprovar): `src/app/api/admin/kyc/approve/route.ts`

### Gates / risco

- Gate transacional e geofraud: `src/lib/services/risk-gates.ts`
- Jurisdição: `src/lib/services/jurisdiction-rules.ts`

### AML

- Regras AML (limites/listas): `src/lib/services/aml-rules.ts`
- Fila de revisão AML (admin): `src/app/api/admin/aml/review-queue/route.ts`

### Depósitos / rails

- PIX (beta): `src/app/api/wallet/deposit/pix/route.ts`
- SEPA (beta): `src/app/api/wallet/deposit/sepa/route.ts`
- Cripto webhook: `src/app/api/webhooks/crypto/usdt/route.ts`
- Endereço cripto por usuário: `src/lib/services/polygon.ts`

### Auditoria

- Logger e audit events: `src/lib/logger.ts`
- Modelo `AuditLog`: `prisma/schema.prisma`

## Roadmap / futuro (não implementado como realidade atual)

- Event-driven deposits para PIX/SEPA com entidade `DepositRequest` e timeout de PENDING.
- Screening externo (sanctions/PEP/adverse media) via provedor dedicado (se contratado) e trilha de auditoria das consultas.

