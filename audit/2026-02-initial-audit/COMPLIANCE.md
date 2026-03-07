# GlobalSecureSend — Compliance & Regulatory Overview

## 📌 Objetivo
Este documento descreve como o sistema GlobalSecureSend cumpre requisitos essenciais de:

- KYC / AML
- Segurança de sessão
- Integridade financeira
- Idempotência
- Auditoria e rastreabilidade

---

# 1. KYC & AML

## 1.1 Níveis KYC
| Nível | Limite | Status |
|-------|---------|--------|
| KYC 0 | €150 | PENDING |
| KYC 1 | €2.500 | APPROVED |
| KYC 2 | €15.000 | APPROVED |

Validação implementada em:
- middleware de transação
- serviços de transferência
- testes de resiliência

---

# 2. Ledger & Integridade Financeira

## 2.1 Atomicidade
Todas as operações financeiras usam:
- `prisma.$transaction`
- rollback automático em caso de falha
- isolamento serializável em cenários críticos

## 2.2 Idempotência
- Stripe: `stripeSessionId` único
- Crypto: `txHash` único
- Webhooks duplicados → ignorados

---

# 3. Segurança

## 3.1 Sessões
- JWT assinado com chave de 32+ chars
- Expiração configurada
- Proteção contra tampering

## 3.2 Dados sensíveis
- Hash de senha com bcrypt
- Nunca armazenamos dados de cartão

---

# 4. Auditoria & Logs

## 4.1 Logs de transação
Cada operação gera:
- registro no ledger
- registro no transactionLog
- walletTransaction

## 4.2 CI/CD Logs
- Execução completa das Fases 1–4
- Logs exportáveis
- Ambiente reprodutível

---

# 📈 Conclusão
O sistema atende requisitos essenciais de:

- KYC
- AML
- Segurança
- Integridade financeira
- Auditoria

**Status: Compliant**
