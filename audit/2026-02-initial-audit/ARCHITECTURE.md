# GlobalSecureSend — Architecture Overview

## 📌 Objetivo
Descrever a arquitetura técnica do sistema, incluindo:

- Componentes principais
- Fluxos financeiros
- Webhooks
- Ledger
- Resiliência
- CI/CD

---

# 1. Componentes Principais

## 1.1 Backend (Next.js API Routes)
- Auth
- KYC
- Ledger
- Transfers
- Swaps
- Webhooks (Stripe + Blockchain)

## 1.2 Banco de Dados (PostgreSQL)
Tabelas principais:
- User
- Wallet
- WalletTransaction
- Transfer
- TopUp
- CryptoDeposit
- TransactionLog

---

# 2. Fluxos Financeiros

## 2.1 Depósito (Stripe)
1. Cliente cria sessão
2. Stripe envia webhook
3. Sistema valida assinatura
4. Cria TopUp (idempotente)
5. Credita saldo

## 2.2 Depósito (Crypto)
1. Blockchain → Alchemy webhook
2. Evento PENDING
3. Evento CONFIRMED
4. Crédito único

## 2.3 Transferência P2P
- Validação KYC
- Validação saldo
- Transação atômica

---

# 3. Ledger

## 3.1 Propriedades
- ACID
- Atomicidade
- Idempotência
- Rastreabilidade

## 3.2 Estrutura
- walletTransaction
- transactionLog
- saldo derivado

---

# 4. Resiliência

## 4.1 Webhooks duplicados
Ignorados via chave única.

## 4.2 Eventos fora de ordem
CONFIRMED prevalece sobre PENDING.

## 4.3 Timeouts externos
Retry com backoff.

---

# 5. CI/CD Pipeline

## 5.1 Execução
- Banco isolado
- Prisma push
- Seed
- Testes Fase 1–4
- Logs exportáveis

---

# 📈 Conclusão
A arquitetura do GlobalSecureSend é:

- modular
- segura
- auditável
- resiliente
- pronta para produção

**Status: Architecture-Ready**
