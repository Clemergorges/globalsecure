# GlobalSecureSend — Whitepaper (Resumo)

## Visão
Neobank híbrida que une FIAT e blockchain (USDT/Polygon) para transferências globais rápidas, baratas e seguras, com cartões virtuais e compliance robusto.

## Proposta de Valor
- Contas multi-moeda com baixo custo operacional (serverless).
- Transferências internacionais via USDT/Polygon com liquidação quase instantânea.
- Cartões virtuais (Stripe Issuing) com controles de gasto.
- KYC/AML integrado e auditoria técnica contínua.

## Arquitetura
- Frontend/Backend: Next.js (App Router) + API Routes.
- Banco: PostgreSQL (Prisma ORM).
- Serviços: Stripe, Alchemy (Polygon), Pusher, Storage privado.
- Resiliência: webhooks idempotentes, retries com backoff, transações atômicas.

## Segurança & Compliance
- 2FA, sessão segura, hash de senha, sem armazenamento de PAN/CVV.
- KYC por níveis, limites transacionais, auditoria e logs.
- Idempotência em webhooks e proteção contra eventos fora de ordem.

## Modelo de Negócio
- Receita via spread cambial, interchange fees e saques expressos.
- Foco em nômades digitais, freelancers e empresas globais.

## Estado Atual
- Suites de teste (Fases 1–4) validadas.
- Documentação EMI pronta (Compliance, Arquitetura, Test Report).
- CI/CD com execução automatizada e ambiente reprodutível.
