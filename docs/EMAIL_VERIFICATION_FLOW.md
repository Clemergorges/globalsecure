# Fluxo de Verificação de Email (Cadastro)

Este documento descreve o fluxo 1 → 2 → 3 usado no cadastro com confirmação por email via OTP (código de 6 dígitos).

## 1) Cadastro

- Página: [register/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/auth/register/page.tsx)
- API: [register/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/auth/register/route.ts)

### Payload obrigatório

- `email` (string, formato email)
- `password` (string, mínimo 8, com 1 maiúscula e 1 número)
- `country` (string, 2 letras)
- `gdprConsent` (boolean, obrigatório true)
- `marketingConsent` (boolean, opcional)

### Comportamento do backend

- Cria usuário com `emailVerified = false`
- Cria `account` com `status = UNVERIFIED`
- Gera OTP de 6 dígitos com expiração de 15 minutos, salva no banco como não usado
- Envia email com o OTP
- Se o envio do email falhar, o cadastro é revertido e a API retorna erro

### Respostas comuns

- `201`: criado com sucesso
- `409`: email já cadastrado
- `400`: dados inválidos
- `503`: falha no envio do email de verificação

## 2) Verificação de Email (OTP)

- Página: [verify/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/verify/page.tsx) (rota `/verify?email=...`)
- API: [verify-email/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/auth/verify-email/route.ts)

### Payload

- `email`
- `code` (6 dígitos)

### Validações

- Usuário existe e ainda não está verificado
- OTP existe para o usuário, não está usado e não expirou
- Em caso de sucesso:
  - marca OTP como usado
  - atualiza `user.emailVerified = true`
  - se a conta estiver `UNVERIFIED`, atualiza para `PENDING`

### Respostas de erro (frontend pode usar `code`)

- `OTP_INVALID`: código incorreto
- `OTP_EXPIRED`: código expirado
- `OTP_USED`: código já utilizado

## Reenvio de código (recomendado)

- API: [resend-verification/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/auth/resend-verification/route.ts)
- UI: botão “Reenviar código” na página `/verify`

Regras:

- Rate-limit básico por IP + email
- Invalida OTPs anteriores não usadas e cria uma nova

## 3) Login

- Página: [login/page.tsx](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/auth/login/page.tsx)
- API: [login-secure/route.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/app/api/auth/login-secure/route.ts)

Política atual:

- Login é bloqueado quando `emailVerified = false`, retornando `403` com `code = EMAIL_NOT_VERIFIED`
- Quando verificado, o backend gera cookie HttpOnly `auth_token`

## Variáveis de ambiente (SMTP)

Serviço: [email.ts](file:///c:/GlobalSecure2026!/globalsecuresend/src/lib/services/email.ts)

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM` (ex.: `"GlobalSecureSend" <no-reply@globalsecuresend.com>`)

