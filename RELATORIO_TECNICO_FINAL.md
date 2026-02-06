# 🏗️ Relatório de Engenharia e Viabilidade Técnica
**Projeto:** GlobalSecureSend  
**Data:** 06 de Fevereiro de 2026  
**Status Atual:** MVP Avançado / Demo-Ready

---

## 1. Resumo Executivo
O sistema atual é um **Demonstrativo Técnico de Alta Fidelidade**. Ele prova a capacidade de execução, a integração de APIs complexas (Stripe, Blockchain) e a visão do produto.

Para fins de captação de investimento, o sistema é **10/10**. Ele funciona, é rápido e visualmente polido.

Para fins de operação bancária real ("Go-Live"), o sistema é **4/10**. Existem vulnerabilidades críticas de segurança de dados e consistência financeira que precisam ser corrigidas antes de processar o primeiro centavo de um cliente real.

---

## 2. Análise de Arquitetura

### ✅ Pontos Fortes (O que manter)
1.  **Stack Tecnológico Moderno:** Next.js 15 (App Router), Prisma e PostgreSQL são escolhas sólidas e escaláveis.
2.  **Integração Stripe (Issuing & Checkout):**
    *   Implementação correta de Webhooks com validação de assinatura (evita fraudes).
    *   PCI-DSS Compliance: Não armazenamos dados sensíveis (PAN/CVV) no nosso banco. A rota de `/reveal` consome direto da Stripe.
3.  **Precisão Decimal:** Uso de tipos `Decimal` no banco de dados evita erros de arredondamento financeiro comuns.

### 🚨 Riscos Críticos (O que corrigir antes do Go-Live)

#### A. Segurança de Dados (KYC) — **Gravidade: ALTA**
*   **Problema:** Documentos de identidade (KYC) estão sendo salvos localmente na pasta `public`.
*   **Risco:**
    *   **Exposição:** Arquivos acessíveis via URL pública sem autenticação.
    *   **Perda de Dados:** Em arquitetura Serverless (Vercel), o armazenamento local é efêmero. Os arquivos somem após o deploy.
*   **Solução Obrigatória:** Migrar para AWS S3 ou Vercel Blob com *Presigned URLs* e acesso privado.

#### B. Core Bancário (Ledger) — **Gravidade: MÉDIA/ALTA**
*   **Problema:** Possível "Race Condition" (Condição de Corrida) nas transferências.
*   **Cenário:** Se duas requisições de saque chegarem no mesmo milissegundo, o sistema pode ler o saldo antigo duas vezes e permitir o gasto duplo.
*   **Solução Obrigatória:** Implementar *Database Locking* (SELECT FOR UPDATE) ou garantir a verificação de saldo na própria query de UPDATE (`WHERE balance >= amount`).

#### C. Escalabilidade Global — **Gravidade: MÉDIA**
*   **Problema:** A tabela `Wallet` tem colunas fixas (`balanceEUR`, `balanceUSD`).
*   **Impacto:** Adicionar novas moedas (BRL, JPY) exige alteração estrutural no banco e downtime.
*   **Solução Recomendada:** Normalizar para uma tabela `Balances` (`userId`, `currency`, `amount`).

---

## 3. Roteiro Técnico Pós-Investimento

Se o objetivo é transformar este MVP em um Neobank real, o roadmap técnico deve ser:

### Fase 1: Hardening (Mês 1-2)
*   [ ] Implementar armazenamento seguro (S3/Blob) para documentos.
*   [ ] Reescrever a lógica de transferência para garantir atomicidade total (ACID) sob alta carga.
*   [ ] Implementar Idempotência (evitar que um clique duplo envie dinheiro duas vezes).

### Fase 2: Compliance & Globalização (Mês 3-4)
*   [ ] Integração real de KYC (Stripe Identity ou Onfido) com Liveness Check.
*   [ ] Suporte dinâmico a múltiplas moedas.
*   [ ] Logs de auditoria imutáveis para reguladores financeiros.

### Fase 3: Escala (Mês 5+)
*   [ ] Separação de microsserviços (Ledger vs. Frontend).
*   [ ] Implementação de filas (Kafka/SQS) para processamento assíncrono de transações.

---

## 4. Conclusão Honesta
O **GlobalSecureSend** hoje é uma Ferrari com tanque de vidro. É lindo, potente e impressiona quem vê, mas não deve ir para a pista de corrida (mercado real) sem reforçar a estrutura.

**Recomendação:** Use este software para fechar a rodada de investimento. Ele cumpre 100% do papel de vender a visão. Após o cheque cair, invista na refatoração de segurança descrita acima.
