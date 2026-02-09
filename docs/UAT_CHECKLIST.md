# GlobalSecureSend - UAT Checklist (Staging)

Este documento guia a validação final antes do deploy em produção.

## 1. Ambiente
- [ ] Staging acessível via HTTPS (staging.globalsecuresend.com)
- [ ] Banco de dados limpo/resetado ou com dados de teste conhecidos
- [ ] Redis operante
- [ ] Variáveis de ambiente configuradas corretamente (STRIPE_TEST_KEY, etc.)

## 2. Core Banking (Web)
- [x] **Cadastro/Login:** Criar usuário novo, verificar email (mock), login com senha. (Validado via script)
- [x] **KYC:** Enviar documento fake, verificar status "PENDING" -> "APPROVED" (via script admin). (Validado via script)
- [ ] **Saldo:** Depositar via Stripe (Top-up). Verificar crédito imediato.
- [ ] **Transferência Interna (P2P):** Enviar para outro usuário por email. Verificar débito/crédito.
- [ ] **Extrato:** Verificar se as transações aparecem corretamente com status.

## 3. Cartões Virtuais (Web & Mobile)
- [ ] **Criação:** Criar cartão "Visa" com saldo de 50 EUR.
- [ ] **Visualização:** Revelar dados sensíveis (PAN/CVV) após autenticação/confirmação.
- [ ] **Controles:** Definir limite de gasto diário.
- [ ] **Bloqueio:** Bloquear temporariamente o cartão e tentar usar (deve falhar).
- [ ] **Wallet (Mobile):** Adicionar cartão à Apple/Google Wallet (simulado ou sandbox).
- [ ] **Transação:** Simular compra no Stripe com os dados do cartão virtual.

## 4. Mobile App (React Native)
- [ ] **Instalação:** Build instalar no simulador/dispositivo.
- [ ] **Login:** Autenticar com credenciais criadas na Web.
- [ ] **Lista de Cartões:** Visualizar cartões criados.
- [ ] **Deep Links:** Abrir app via link de email (ex: verificação, ativação).

## 5. Criptoativos
- [ ] **Depósito:** Gerar endereço Polygon. Enviar MATIC/USDT (Testnet).
- [ ] **Confirmação:** Verificar se o saldo atualiza após confirmações da rede.
- [ ] **Swap:** Converter USDT -> EUR. Verificar taxa e spread.
- [ ] **Saque:** Enviar Crypto para carteira externa.

## 6. Segurança & Performance
- [x] **Rate Limit:** Disparar 100+ requests seguidos e verificar bloqueio (429). (Validado via script)
- [ ] **Session:** Tentar usar token expirado (deve deslogar).
- [ ] **SQL Injection:** Tentar inputs maliciosos em campos de busca.
- [x] **Health Check:** API responsiva em /api/health (Validado via script)

## 7. Webhooks & Integrações
- [ ] **Stripe Webhook:** Verificar se eventos (payment_intent.succeeded) são processados.
- [ ] **Notificações:** Verificar se emails de alerta são "enviados" (logs).

---
**Status Final:**
[ ] APROVADO PARA PRODUÇÃO
[ ] REPROVADO (Listar bloqueios abaixo)
**Relatório Automatizado (09/02/2026):**
- Core Banking (Auth/KYC): ✅ PASS
- Rate Limiting: ✅ PASS
- Health Check: ✅ PASS
