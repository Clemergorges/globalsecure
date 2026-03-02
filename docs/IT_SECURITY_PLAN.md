# Plano de TI e Segurança (GlobalSecureSend)

## 1) Objetivo e Escopo
- Definir como a tecnologia é construída, operada e mantida.
- Definir como segurança e conformidade são implementadas e verificadas.
- Cobrir produção (Vercel), desenvolvimento e testes, incluindo integrações com Stripe e Polygon/USDT.

**Escopo técnico (alto nível)**
- Web/App: Next.js App Router.
- Backend: Route Handlers em `src/app/api/**`.
- Persistência: Prisma + banco (via `@/lib/db`).
- Pagamentos FIAT: Stripe Checkout + Webhooks.
- Cripto: Polygon USDT (endereços por usuário, webhook de depósitos, withdraw via fila).
- Observabilidade: logging + auditoria + alertas.

## 2) Arquitetura de TI (visão operacional)

### 2.1 Componentes
1. **Frontend (Next.js)**
   - Páginas e dashboards servidos via Vercel.
2. **API (Next.js Route Handlers)**
   - Endpoints em `src/app/api/**`.
3. **Banco de Dados (Prisma)**
   - Ledger e trilha de auditoria.
4. **Redis (Rate-limit e filas)**
   - Rate limiting e processamento assíncrono.
5. **Provedores externos**
   - Stripe (Checkout + Webhooks).
   - Alchemy (Webhook de eventos on-chain).
   - RPC Polygon (envio/transações).

### 2.2 Fluxos de dados (textual)
1. **Top-up FIAT (Stripe)**
   - `POST /api/wallet/topup` cria sessão Stripe e grava TopUp PENDING.
   - `POST /api/webhooks/stripe` confirma pagamento e credita saldo no ledger.
2. **Depósito USDT (Polygon)**
   - Usuário obtém endereço: `GET /api/crypto/address`.
   - Alchemy notifica depósito: `POST /api/webhooks/crypto/usdt`.
   - Sistema cria `CryptoDeposit` e credita ledger.
3. **Withdraw USDT**
   - `POST /api/crypto/withdraw` debita ledger e cria `CryptoWithdraw(PENDING)`.
   - `GET /api/cron/process-queue` processa fila e conclui withdraw (MVP).

**Referências de implementação**
- Topup (Stripe): [wallet/topup/route.ts](../src/app/api/wallet/topup/route.ts)
- Webhook Stripe: [webhooks/stripe/route.ts](../src/app/api/webhooks/stripe/route.ts)
- Endereço cripto: [crypto/address/route.ts](../src/app/api/crypto/address/route.ts)
- Webhook USDT: [webhooks/crypto/usdt/route.ts](../src/app/api/webhooks/crypto/usdt/route.ts)
- Withdraw: [crypto/withdraw/route.ts](../src/app/api/crypto/withdraw/route.ts)
- Fila/cron: [cron/process-queue/route.ts](../src/app/api/cron/process-queue/route.ts)
- Módulo Polygon/USDT: [polygon.ts](../src/lib/services/polygon.ts)


## 3) Governança de Segurança

### 3.1 Papéis e responsabilidades (operador solo)
- **Responsável por TI**: arquitetura, mudanças, capacidade e custos.
- **Responsável por Segurança**: políticas, risco, incidentes e auditorias.
- **Responsável por Dados (GDPR)**: mapeamento, retenção e direitos do titular.
- **Responsável por Terceiros**: Stripe, Alchemy, Vercel, Redis/DB provider.

### 3.2 Controle de acesso (princípio do menor privilégio)
- Produção: acesso administrativo mínimo, revisado periodicamente.
- Separação de responsabilidades: chaves e segredos com escopo mínimo (Stripe/Alchemy/RPC/SMTP).
- Autenticação forte para contas administrativas (MFA sempre que disponível).

## 4) Proteção de Dados (GDPR)

### 4.1 Inventário e classificação (exemplos)
- Dados pessoais: nome, e-mail, telefone, IP, user-agent.
- Dados financeiros: movimentos (ledger), depósitos/withdraws, histórico de transações.
- Dados sensíveis: chaves e segredos; nunca persistir em logs.

### 4.2 Medidas técnicas
- TLS em trânsito (Vercel/HTTPS).
- Criptografia/segredos: variáveis de ambiente e segregação por ambiente.
- Minimização: retornar ao cliente apenas dados necessários (ex.: dados públicos do claim vs dados sensíveis após unlock).
- Auditoria: registrar ações sensíveis (ex.: tentativas de unlock).

## 5) Resiliência Operacional (DORA)

### 5.1 Objetivos
- Definir RTO/RPO por serviço:
  - API e Web: RTO alvo (ex.: minutos), RPO alvo (ex.: último commit de DB + backups).
  - Ledger e webhooks: prioridade máxima (integridade e idempotência).

### 5.2 Continuidade e recuperação
- Backups: banco com snapshots automatizados e teste de restore.
- DR: procedimento documentado para:
  - invalidar segredos comprometidos (Stripe/Alchemy/RPC/SMTP),
  - pausar webhooks,
  - colocar endpoints críticos em modo “degradado”.

### 5.3 Monitoramento e alertas
- Alertas para:
  - falhas de webhooks,
  - falhas de fila/cron,
  - excesso de rate-limit,
  - erros 5xx por endpoint crítico.

## 6) Gestão de Riscos (TI e terceiros)

### 6.1 Matriz de riscos (modelo)
- **Disponibilidade**: indisponibilidade de Vercel/DB/Redis.
- **Integridade**: double-credit/double-spend, falha de idempotência.
- **Confidencialidade**: vazamento de segredos, logs com dados sensíveis.
- **Fraude**: abuso de withdraw, brute-force de códigos, criação de contas falsas.

### 6.2 Terceiros
- Stripe:
  - risco de indisponibilidade, disputa/chargeback, falhas de webhook.
- Alchemy/RPC:
  - risco de eventos duplicados, atrasos, spoofing sem HMAC.
- Vercel:
  - risco de deploy incorreto, env incorreta, rollback.

## 7) Controles Técnicos (baseline)

### 7.1 Rate limiting e anti-abuso
- Rate-limit no backend com Redis (janela e limite por identificador).
- Uso recomendado: headers de rate limit para clientes se comportarem melhor.

Referência: [rate-limit.ts](../src/lib/rate-limit.ts)

### 7.2 Ledger: integridade transacional
- Débito com guarda atômica (evita saldo negativo).
- Crédito com `upsert` e idempotência em webhooks.

Referência: [ledger.ts](../src/lib/services/ledger.ts)

### 7.3 Gestão de segredos
- Nunca logar segredos.
- Rotacionar segredos periodicamente e após incidentes.
- Segregar `.env.local` (dev) vs envs da Vercel (prod).

### 7.4 Chaves cripto
- `WALLET_PRIVATE_KEY` deve ficar exclusivamente em secrets de produção.
- Rotação e procedimento de emergência para comprometimento.

## 8) Monitoramento, Logging e Auditoria
- Logs de aplicação: erros, warnings e eventos críticos.
- Audit log: ações sensíveis (unlock, withdraw, mudanças administrativas).
- Observabilidade:
  - Sentry para exceções (se configurado),
  - painéis e alertas (Slack/email) para eventos críticos.

## 9) Resposta a Incidentes

### 9.1 Classificação
- Segurança: vazamento, fraude, brute force, exploração de API.
- Operação: indisponibilidade, falha em webhooks, falha na fila.

### 9.2 Procedimento (runbook)
1. Identificar e classificar (severidade, impacto, escopo).
2. Conter (bloquear rotas, aumentar rate-limit, pausar webhooks).
3. Erradicar (corrigir bug, rotacionar chaves, patch).
4. Recuperar (restaurar serviços, validar ledger e idempotência).
5. Comunicar (clientes/fornecedores/reguladores quando aplicável).
6. Pós-incidente (post-mortem, ações preventivas, auditoria).

## 10) Desenvolvimento Seguro e CI/CD
- Lint e typecheck obrigatórios antes de deploy.
- Testes automatizados no CI (unit/integration/e2e conforme disponibilidade).
- SAST/DAST: adicionar ferramenta conforme maturidade (não descrita no codebase atual).
- Política de mudanças: PRs, revisão e trilha de auditoria de deploy.

## 11) Conformidade (mapeamento resumido)

### 11.1 PSD2 (segurança de pagamentos)
- Proteção de credenciais, rastreabilidade e detecção de fraude.
- Webhooks Stripe com idempotência e auditoria.

### 11.2 AML5 (prevenção à lavagem de dinheiro)
- Trilhas de transação (ledger) e monitoramento de padrões.
- Regras de limite e alertas para operações suspeitas.

### 11.3 GDPR
- Minimização e retenção.
- Segurança de dados em trânsito e controles de acesso.
- Procedimentos para solicitações do titular (acesso/retificação/eliminação).

### 11.4 DORA
- Continuidade (BCP/DRP), testes, monitoramento e gestão de terceiros.

### 11.5 ISO 27001 (estrutura)
- Políticas, inventário de ativos, controles, auditoria e melhoria contínua.

## 12) Apêndices
- Relatório de testes automatizados: `docs/SECURITY_TEST_REPORT.md`
- Plano de simulações e métricas: `docs/SECURITY_SIMULATIONS.md`
