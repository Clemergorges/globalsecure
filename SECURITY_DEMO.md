# Demo de Segurança Audit-Proof (Automated)

Este documento comprova a robustez e maturidade técnica da plataforma GlobalSecureSend.

## 🚀 Execução da Validação

Para validar o fluxo de segurança de ponta a ponta, execute:

```bash
npx tsx scripts/validate-demo-flow.ts
```

## ✅ O que é validado?

O script executa um fluxo completo simulando um usuário real e tentativas de ataque:

1.  **Login Seguro**: Autenticação via rota protegida `/api/auth/login-secure` (Rate Limit + Delay).
2.  **Gestão de Sessão**: Validação de Cookie `HttpOnly` e geração de JWT assinado.
3.  **Acesso Protegido**: Consulta de saldo em `/api/wallet/balance` exigindo autenticação válida.
4.  **Validação de Schema (Zod)**: Tentativa de transferência com valor negativo é rejeitada (Status 400).
5.  **Transação Financeira (ACID)**: Transferência interna válida executada com sucesso e registrada no Ledger.
6.  **Defesa Ativa (Rate Limit)**: Disparo de múltiplas requisições simultâneas para validar o bloqueio automático (Status 429).

## 📊 Evidência de Execução

Saída esperada do terminal:

```text
🚀 Starting Security Demo Flow Validation...

📦 Setting up test users...
✔ User clemergorges@hotmail.com password reset to 'password123'

🔐 Testing Login Flow (/api/auth/login-secure)...
✔ Login Successful! Cookie received.

💰 Testing Balance View (/api/wallet/balance)...
✔ Balance Retrieved: {"EUR":1000000,"USD":1000000,"GBP":1000000}

💸 Testing Internal Transfer (/api/transfers/internal)...
  Testing Validation (Invalid Amount)...
✔ Validation Caught Invalid Request (Status 400)
  Testing Valid Transfer...
✔ Transfer Successful!

🛑 Testing Rate Limit (Firing 6 requests)...
✔ Request 6 Blocked (429)

🏁 Demo Validation Complete!
```

---
*Gerado automaticamente em 2026-02-11*
