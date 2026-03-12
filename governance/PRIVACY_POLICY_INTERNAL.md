# GSS — Privacy Policy (Internal)

Versão: 0.1

Data de criação: 2026-03-12

Data de última revisão: 2026-03-12

Responsável: (preencher)

## Objetivo

Descrever como a GSS trata dados pessoais (PII) e dados sensíveis (KYC/financeiro) na prática, mapeando entidades do banco e controles técnicos existentes.

## Escopo

- Dados pessoais e sensíveis armazenados em PostgreSQL (Prisma).
- Logs operacionais (Vercel) e auditoria (`AuditLog`).
- Consentimento, exportação e exclusão/erase.

## Dados e classificação

### Entidades de banco com PII/sensíveis (principais)

- `User` (PII): e-mail, nome, telefone, dados de nascimento/nacionalidade, documento.
- `Address` (PII): endereço postal.
- `KycVerification` (sensível): status/decisão, motivos, reviewedBy/reviewedAt.
- `Session` (técnico + potencial sensível): IP/UA, expiração, revogação.
- `UserConsentRecord` (PII/consentimento): tipo, versão, IP/UA, timestamp.
- `AuditLog` (técnico + potencial PII): `ipAddress`, `userAgent`, `path`, `metadata`.

Observação operacional:
- Outros modelos podem conter dados indiretos (ex.: `Transfer`, `Notification`, `AccountTransaction`) e devem ser revisados antes de adicionar campos com PII.

## Regras operacionais concretas

### Minimização

- Apenas armazenar dados necessários para:
  - autenticação/sessão
  - KYC/AML e limites
  - execução de transações e auditoria
- Evitar duplicar PII em múltiplas tabelas.

### Logs e auditoria

- Não logar segredos (`JWT_SECRET`, webhook secrets, tokens).
- Não logar payload completo de webhooks.
- Evitar e-mail/telefone completos em logs; preferir `userId` e/ou dados minimizados (ex.: últimos 4 dígitos).
- `AuditLog.metadata` deve ser tratado como potencialmente sensível; limitar tamanho e evitar campos como `password`, `token`, `authorization`.

### Retenção

- Dados de auditoria e transações devem ser retidos conforme necessidade legal/operacional.
- A política de retenção detalhada deve ser definida pelo responsável e revisada periodicamente.

### Atendimento a solicitações (exportação e exclusão)

- Exportação: o sistema expõe rotas para exportação de dados do usuário.
- Erase: o sistema possui mecanismo de exclusão/anonimização controlada.

Roadmap/futuro:
- Definir e automatizar política de retenção por categoria (PII, KYC, transacional, logs) com prazos e legal hold.

## Controles técnicos relacionados

- Modelos de dados: `prisma/schema.prisma` (`User`, `Address`, `KycVerification`, `AuditLog`, `UserConsentRecord`, `Session`)

### Consentimento

- Serviço de documentos/consent: `src/lib/services/privacy-consent.ts`
- API de consents: `src/app/api/user/privacy/consents/route.ts`
- Registro no cadastro: `src/app/api/auth/register/route.ts`

### Exportação/erase

- Exportação: `src/app/api/user/privacy/export/route.ts` e `src/app/api/user/privacy/export/[id]/route.ts`
- Erase: `src/app/api/user/privacy/erase/route.ts` e `src/app/api/user/privacy/erase/status/route.ts`
- Serviço: `src/lib/services/privacy-erasure.ts`

### Auditoria/logs

- Logger e `logAudit`: `src/lib/logger.ts`
- Modelo `AuditLog`: `prisma/schema.prisma`

## Roadmap / futuro (não implementado como realidade atual)

- Pseudonimização sistemática de campos sensíveis em `AuditLog.metadata`.
- Redação automática de PII em logs e rastreio de acesso a dados administrativos.
- Processo formal de notificação de incidentes com prazos LGPD/GDPR e evidências.

