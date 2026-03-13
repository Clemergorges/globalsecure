# GlobalSecureSend (GSS-PAY) — Relatório Executivo e Técnico (realista, com marketing responsável)

Este documento é desenhado para submissão ao **EIC Accelerator**. Ele separa claramente: **o que já existe (hoje)**, **o que está em construção**, e **o que depende de parceiros/licenças**. Onde houver números, eles são marcados como **(projeção)** e devem ser substituídos por dados reais quando existirem.

---

## 1) Visão geral (1 minuto)

A **GlobalSecureSend (GSS-PAY)** está construindo uma plataforma de pagamentos transfronteiriços com foco no “último quilômetro” da experiência: **entrega simples ao destinatário (ex.: por e-mail) + camadas de segurança (OTP/2FA) + trilhas de auditoria**, enquanto a liquidação e execução financeira em produção são realizadas por **parceiros regulados (issuer/rails)**.

Em vez de prometer substituir toda a infraestrutura bancária de uma vez, a GSS propõe uma execução incremental: **MVP funcional → pilotos controlados → integração com parceiros regulados → operação resiliente e escalável**.

---

## 2) Problema e oportunidade

Transferências internacionais continuam caras e imprevisíveis, com fricção elevada para onboarding e recepção (especialmente quando o destinatário não tem conta bancária fácil, IBAN, ou vive em regiões com dependência de horários/feriados). Isso afeta:

- **Migrantes e famílias** (remessas)
- **Freelancers** (recebimento internacional)
- **PMEs** (pagamentos e recebimentos em múltiplos países)

O objetivo da GSS é atacar o que trava adoção: **simplicidade na entrega e controle de risco**, com caminho claro para trilhos regulados e redundância de parceiros.

---

## 3) Proposta de valor (o que é diferente)

- **Entrega simplificada ao destinatário**: reduzir a fricção do “primeiro contato” e permitir que um destinatário receba e interaja com o valor sem exigir uma conta bancária imediatamente.
- **Segurança prática por padrão**: OTP/2FA e fluxos de confirmação para ações sensíveis; foco em reduzir takeover e abuso.
- **Arquitetura preparada para auditoria**: trilhas de eventos e governança de dados (privacy-by-design) como base para operação regulada.
- **Plano realista para operação regulada**: emissão/rails em produção via parceiros, com caminho incremental do sandbox ao production.

---

## 4) Estado atual do produto (o que já existe hoje)

### 4.1 Produto (web)
- Fluxos completos de autenticação: login, cadastro, recuperação e reset.
- Área logada com dashboard e configurações.
- Fluxos de verificação e códigos (OTP) para segurança e ações sensíveis.

### 4.2 Controles de segurança e sensibilidade
- Mecanismos para OTP/2FA e confirmações em ações sensíveis.
- Estrutura inicial para logs/auditoria e controles de risco (com evolução planejada).

### 4.3 Integrações técnicas já presentes (base)
- **KYC de indivíduo** com integração técnica via **Stripe Identity** (base para evoluir onboarding).
- **OTP/SMS** com provedor e serviço interno de desafio/confirmação.
- Estrutura de **webhooks** e integrações financeiras como base para evoluir integrações de parceiros.

---

## 5) O que ainda NÃO está pronto (e não deve ser afirmado como concluído)

Para manter o documento consistente com a realidade e com práticas de compliance:

- **Issuer / emissão de cartão em produção**: depende de contratos e integração com um emissor/processor regulado (sandbox → produção).
- **Rails locais (SEPA/PIX) em produção**: exige parceiros, reconciliação, regras de cada país e operação.
- **Conformidade “nativa” (MiCA/PSD2) como produto pronto**: a GSS pode ser desenhada para suportar auditoria e controles, mas operação regulada depende de licenças, parceiros e processos internos.
- **“Ledger sub-milissegundo” e “IA antifraude”**: isso é roadmap; hoje o foco é observabilidade + regras + revisão manual evolutiva.

---

## 6) Prontidão tecnológica (TRL) — avaliação honesta

- **TRL atual: 5–6**
  - Protótipo funcional com fluxos de produto e segurança (OTP/2FA) e integrações técnicas base (sandbox).
  - Pronto para **pilotos controlados** e testes de usabilidade/conversão/risco.

- **Objetivo com o EIC: TRL 7–8**
  - Fortalecer observabilidade, resiliência e segurança (produção).
  - Evoluir KYC/AML e trilhas auditáveis.
  - Integrar com parceiros regulados (issuer/rails) em sandbox e migrar para produção com reconciliação e redundância.

---

## 7) Arquitetura (visão técnica de alto nível)

### 7.1 Componentes
- **Web app (Next.js)**: UX, autenticação, dashboards e fluxos de OTP.
- **API/rotas server-side**: endpoints de autenticação, sessões, operações sensíveis, integrações e webhooks.
- **Serviços de segurança**: OTP challenge/confirm, controles de sessão e mecanismos de auditoria.

### 7.2 Princípios de evolução sem quebrar o sistema
- **Adição incremental**: novos módulos entram como “shadow” (em paralelo) antes de virar fonte de verdade.
- **Feature flags**: rollout controlado por ambiente (dev/staging/prod) e por perfil.
- **Contratos estáveis**: adapters para integrar rails/issuers sem acoplar o domínio a um único fornecedor.

---

## 8) Roadmap (24 meses) — prático e executável

### Fase 1 (0–6 meses): pilotos controlados + hardening
- Observabilidade base (logs/metrics/tracing), runbooks e monitorização.
- Testes automatizados e segurança do SDLC.
- Evolução de OTP/2FA e proteção contra abuso (rate limiting, replay, antifraude por regras).
- Pilotos com escopo limitado (ex.: corredor UE–LATAM), com métricas de sucesso claras.

### Fase 2 (7–12 meses): integrações reguladas (sandbox → produção)
- Seleção e integração com **issuer/processor** (cartão virtual), com redundância planejada.
- Integração com **rails locais** (SEPA/PIX) via parceiros (com reconciliação e report).
- Fortalecimento de KYC/AML: KYB, sanções, detecção de padrões, revisão manual operacional.

### Fase 3 (13–24 meses): escala e expansão
- Operação 24/7 com SLAs, processos e ferramentas (NOC, incident response).
- Redundância de provedores e capacidade multi-corridor.
- Expansão por países conforme licenças, parceiros e performance.

---

## 9) Riscos e mitigação (os reais)

- **Regulatório e parceiros** (alto impacto)
  - Mitigação: estratégia de país-alvo, assessoria, contratos e evolução por sandbox/pilotos.

- **Fraude/chargebacks e AML**
  - Mitigação: limites por perfil, revisão manual, trilhas auditáveis, sanções, monitoramento transacional.

- **Confiabilidade e segurança de produção**
  - Mitigação: observabilidade, testes de resiliência, idempotência, proteção de webhooks e governança de segredos.

---

## 10) Funding e uso de recursos (orientado a TRL)

O investimento (grant + eventual equity) deve financiar principalmente:

- **Engenharia de produção**: observabilidade, testes, resiliência, automação.
- **Compliance e operação**: KYC/KYB, AML, auditoria, privacidade e processos.
- **Integrações reguladas**: issuer/rails, reconciliação, redundância e governança.

---

## 11) Métricas (use como “template”)

As métricas abaixo devem ser apresentadas apenas quando existirem dados reais. Até lá, use como estrutura:

- Conversão: visita → cadastro → verificação → primeira transação
- Tempo de execução do fluxo crítico (p50/p95)
- Taxa de falhas por etapa (API/provider)
- Incidentes e MTTR (produção)
- Chargebacks/fraude (% e valor absoluto)

---

## Anexo A — Evidências técnicas no repositório (referências)

As evidências abaixo apontam para módulos já existentes (não são prova de produção regulada, apenas de base técnica):

- Auth (login/register/forgot/reset): `src/app/auth/*/page.tsx`
- Verify (código/OTP): `src/app/verify/page.tsx`
- Security settings (2FA/OTP sensível): `src/app/dashboard/settings/security/page.tsx`
- Card/email + SCA OTP: `src/app/dashboard/cards/components/card-email-dialog.tsx`
- Claim unlock code: `src/app/claim/[token]/page.tsx`
- OTP service: `src/lib/security/otp/*` e `src/app/api/auth/sensitive/otp/*`
- KYC Stripe Identity (base): `src/app/api/kyc/stripe-identity/route.ts`

