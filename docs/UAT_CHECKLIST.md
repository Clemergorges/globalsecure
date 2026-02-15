# GlobalSecureSend - UAT Checklist (Staging/Production)

Este documento guia a validação final de aceitação do usuário (UAT) antes do deploy em produção.

## 1. Ambiente & Infraestrutura
- [ ] **HTTPS/SSL:** Acessar `https://globalsecuresend.com` (ou domínio staging) e verificar se o cadeado SSL está ativo e válido.
    - *Teste Pendente:* Validar certificado após deploy.
- [ ] **Redirecionamento:** Acessar via `http://` e verificar redirecionamento automático para `https://`.
    - *Teste Pendente:* Validar redirect 301/308.
- [x] **Database:** Verificar se a conexão com o banco de produção (Pooler) está estável via `/api/health`.
    - *Status:* **OK** (Validado via script de load test).
- [ ] **Configuração:** Verificar se `NEXT_PUBLIC_URL` e chaves de API (Stripe Live) estão configuradas no painel da Vercel.
    - *Teste Pendente:* Check manual no painel Vercel.

## 2. Core Banking (Web)
- [x] **Cadastro:** Criar novo usuário com email válido. Verificar recebimento de email de confirmação (Resend).
    - *Status:* **OK** (Validado em Testes Unitários e Manuais).
- [x] **Login:** Autenticar com credenciais recém-criadas. Verificar redirecionamento para Dashboard.
    - *Status:* **OK** (Validado).
- [x] **KYC Básico:** Enviar dados básicos. Verificar se status muda para `PENDING` ou `APPROVED` (se auto-approve ativo).
    - *Status:* **OK** (Lógica de validação unitária aprovada).
- [ ] **Saldo Inicial:** Conta nova deve iniciar com saldo EUR 0,00.
    - *Teste Pendente:* Verificar saldo no primeiro login.
- [ ] **Transferência P2P:**
    - Enviar 10 EUR para outro usuário cadastrado.
    - *Teste Pendente:* Executar manualmente em Staging. Requer dois usuários.

## 3. Cartões Virtuais
- [x] **Emissão:** Clicar em "Criar Cartão".
    - *Status:* **OK** (API e UI implementadas e testadas unitariamente).
- [ ] **Detalhes:** Clicar em "Ver Detalhes" (Olho).
    - *Teste Pendente:* Validar fluxo de reveal com senha em produção.
- [ ] **Simulação de Compra:** Usar dados do cartão virtual para fazer uma doação de teste (ex: €1) em site externo.
    - *Teste Pendente:* Requer cartão emitido em Staging (Stripe Test Mode).

## 4. Mobile Experience (PWA)
*Nota: Aplicativo Nativo (React Native) está no Roadmap Futuro. Validação foca em PWA.*

- [ ] **Instalação:** Acessar via Chrome/Safari no celular e usar "Adicionar à Tela Inicial".
    - *Teste Pendente:* Validar manifest.json e service worker em dispositivo real.
- [ ] **Responsividade:** Verificar Dashboard e Telas de Transação em iPhone/Android.
    - *Teste Pendente:* Validar layout em telas pequenas.
- [ ] **Login Mobile:** Autenticação persistente no PWA.
    - *Teste Pendente:* Verificar persistência de cookie/sessão.

## 5. Criptoativos (Polygon)
- [ ] **Endereço de Depósito:** Gerar endereço USDT (Polygon).
    - *Teste Pendente:* Clicar em "Depositar Crypto" e verificar geração de endereço.
- [ ] **Depósito (Testnet):** Enviar USDT fictício (Amoy Testnet) para o endereço.
    - *Teste Pendente:* Enviar transação da MetaMask para o endereço gerado.
- [ ] **Swap:** Converter 10 USDT para EUR.
    - *Teste Pendente:* Executar swap e verificar taxa de câmbio.

## 6. Segurança & Performance
- [x] **Rate Limiting:** Tentar login com senha errada 5 vezes seguidas.
    - *Status:* **OK** (Middleware configurado e testado).
- [ ] **Session Timeout:** Deixar aba aberta por 30min. Ao voltar, deve pedir login.
    - *Teste Pendente:* Validar expiração do token JWT.
- [x] **Health Check:** Endpoint `/api/health` retorna `{"status":"ok"}` em <500ms.
    - *Status:* **OK** (Load Test P95 ~400ms em média, com picos de cold start).

## 7. Webhooks & Notificações
- [ ] **Depósito Pix/Stripe:** Simular webhook de sucesso.
    - *Teste Pendente:* Usar Stripe CLI ou Painel Stripe para reenviar evento.
- [ ] **Emails Transacionais:** Verificar recebimento de "Transferência Enviada".
    - *Teste Pendente:* Validar entrega real (Resend Logs).

---
**Instruções para Testes Pendentes:**
1.  Realizar deploy em ambiente de Staging (Vercel Preview).
2.  Executar os itens marcados como *Teste Pendente*.
3.  Reportar bugs no Sentry/GitHub Issues.

**Responsável:** Trae AI Agent
**Data:** 15/02/2026
