# Jornada do Usuário (UI) — o que um usuário real vê

Este documento descreve a experiência do usuário final na interface (desktop e mobile), indicando as páginas e quais endpoints internos sustentam cada ação.

## Princípio

- Usuário final interage com **páginas e botões**.
- A aplicação chama endpoints internos em `/api/*` para carregar dados e executar ações.
- No mobile, o comportamento funcional é o mesmo; muda apenas layout/responsividade.

## 1) Autenticação

### Login

- Página: `/auth/login`
- Ações do usuário:
  - inserir e-mail/senha
  - entrar
- Endpoints:
  - `POST /api/auth/login-secure`
  - `GET /api/auth/me` (pós-login, para confirmar sessão)

### Registro

- Página: `/auth/register`
- Endpoints:
  - `POST /api/auth/register`
  - `POST /api/auth/resend-verification`
  - `POST /api/auth/verify-email`

### Recuperação de senha

- Páginas: `/auth/forgot-password`, `/auth/reset-password`
- Endpoints:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`

## 2) Dashboard (visão geral)

### Página principal

- Página: `/dashboard`
- O usuário vê:
  - cards com visão geral
  - atalhos de navegação
  - possíveis banners operacionais (quando incidentes/flags)
- Endpoints:
  - `GET /api/dashboard/overview`
  - `GET /api/ops/flags` (banners)
  - `GET /api/user/travel-mode` (ícone/banner do Travel Mode se habilitado)

## 3) Transfers (criar envio)

### Tela de criação

- Página: `/dashboard/transfers/create`
- O usuário vê:
  - formulário (destinatário, valor, moeda)
  - cálculo de fee e total
  - se Yield estiver habilitado na UI, checkbox de “enable yield”
- Endpoints:
  - `GET /api/config/fees` (fee % exibida)
  - `POST /api/transfers/internal` (envio interno)
- Bloqueios que o usuário pode ver (mensagens/erros):
  - limites KYC por transação/dia/mês
  - bloqueios de risco (ex.: geofraude)
  - jurisdição não suportada
  - se yield ligado: kill switch / limite de exposição

## 4) Cards (cartões)

### Lista e ações

- Página: `/dashboard/cards`
- O usuário vê:
  - lista de cartões
  - criar cartão
  - cancelar/remover
  - revelar detalhes (quando aplicável)
  - fluxo “Cartão por e-mail” (enviar um cartão para alguém)
- Endpoints:
  - `GET /api/cards`
  - `POST /api/cards`
  - `DELETE /api/cards/:id`
  - `DELETE /api/cards/:id/cancel`
  - `GET /api/cards/:id/reveal`
  - `POST /api/cards/ephemeral-key`

### Cartão por e-mail (diálogo)

- Ação: abrir modal “Cartão por e-mail”
- O usuário vê:
  - breakdown com fee e total
- Endpoints:
  - `GET /api/config/fees` (fee % exibida)
  - endpoint específico de criação do fluxo (quando acionado pelo diálogo)

### Visualização pública (via link)

- Página: `/card/:token`
- O usuário (destinatário) vê:
  - saldo e transações do cartão (sem login, via token)
- Endpoints:
  - `GET /api/card/email/:token`

## 5) Wallet / Depósitos

- Páginas:
  - `/dashboard/wallet/deposit`
  - `/dashboard/wallet/crypto`
- Endpoints:
  - `GET /api/wallet/balance`
  - `GET /api/wallet/transactions`
  - `GET /api/wallet/transactions/export`
  - `GET|POST /api/wallet/deposit/pix`
  - `GET|POST /api/wallet/deposit/sepa`
  - `GET|POST /api/wallet/deposit/bank-br`
  - `GET /api/wallet/crypto`
  - `GET /api/crypto/address`
  - `POST /api/crypto/withdraw`

## 6) Limits (KYC, risco, AML)

- Página: `/dashboard/limits`
- O usuário vê:
  - KYC status e “próximo passo”
  - risco (tier) e texto explicativo
  - limites de envio
  - card “Compliance/AML status” com status simples
- Endpoints:
  - `GET /api/dashboard/overview` (fonte principal de dados)
  - `GET /api/aml/status` (card de compliance)

## 7) Settings

### KYC

- Página: `/dashboard/settings/kyc`
- Endpoints:
  - `GET /api/kyc/status`
  - `POST /api/kyc/upload`
  - `POST /api/kyc/submit`
  - `POST /api/kyc/stripe-identity`
  - `POST /api/kyc/stripe-identity/sync`

### Segurança

- Página: `/dashboard/settings/security`
- O usuário vê:
  - controles de segurança
  - 2FA
  - sessões
  - Travel Mode toggle (se habilitado)
  - Yield toggle (se habilitado)
- Endpoints:
  - `POST /api/security/2fa/enable`
  - `POST /api/security/2fa/verify`
  - `POST /api/security/2fa/disable`
  - `GET|DELETE /api/security/sessions`
  - `GET|POST|PATCH /api/user/travel-mode`
  - `GET|POST /api/user/yield-toggle`

## 8) Yield (feature gated)

- Página: `/dashboard/yield`
- Visível apenas se `NEXT_PUBLIC_YIELD_UI_ENABLED=true`.
- Endpoints:
  - `GET /api/yield/power`
  - `GET /api/yield/summary`
  - `GET /api/config/fees` (APY exibido)

## 9) Experiência no mobile (pontos críticos)

- A UI é responsiva e usa a mesma base de endpoints.
- Pontos a validar em QA mobile:
  - persistência de cookies (navegadores móveis podem limpar em background)
  - copy/paste de OTP
  - modais (Radix/UI) e scroll lock
  - banners (não devem “tapar” ações primárias)

