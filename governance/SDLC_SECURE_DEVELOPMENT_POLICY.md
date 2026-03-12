# GSS — SDLC & Secure Development Policy (Internal)

Versão: 0.1

Data de criação: 2026-03-12

Data de última revisão: 2026-03-12

Responsável: (preencher)

## Objetivo

Definir o fluxo mínimo de desenvolvimento seguro da GSS (branch, PR, testes, CI e deploy), com regras para mudanças de alto impacto.

## Escopo

- Código do repositório (Next.js + Prisma).
- CI/CD (GitHub Actions + Vercel).
- Mudanças em autenticação, RBAC, pagamentos, KYC/AML, cron/fila e webhooks.

## Regras operacionais concretas

### Branches e PR

- Mudanças devem ser feitas via PR para a branch principal.
- PR deve descrever:
  - o que mudou
  - endpoints/serviços afetados
  - riscos e rollback
- PRs devem ser pequenos e focados (segurança, compliance, performance, testes) quando possível.

### Critérios mínimos de merge

- `npm run typecheck` deve passar.
- `npm run lint` deve passar (warnings devem ser justificados se `continue-on-error` no CI estiver habilitado).
- Testes relevantes devem passar (`test:unit`, `test:integration`, `test:e2e`, `test:failure`).
- Para mudanças de auth/pagamentos/compliance: adicionar ou ajustar ao menos 1 teste que cobre o comportamento alterado.

### Mudanças de alto impacto

Mudanças de alto impacto incluem, no mínimo:
- autenticação/sessões/JWT
- RBAC e endpoints admin
- webhooks e assinatura
- cron/fila e processamento de jobs
- regras de KYC/AML/jurisdição

Regras:
- Devem ter PR dedicado.
- Devem incluir checklist no PR:
  - envs novas adicionadas em `.env.example` e documentadas
  - impacto em Vercel (Production/Preview) avaliado
  - validação mínima em staging/preview quando disponível

### Gestão de variáveis de ambiente

- Toda variável nova:
  - entra em `.env.example`
  - entra em documentação (README ou `governance/*` quando apropriado)
  - deve ser configurada na Vercel (Production e Preview)
- Deploy deve falhar quando env obrigatória estiver ausente (exceto em `NODE_ENV=test`/`CI=true`).

### Deploy

- Deploy é feito via Vercel.
- Após deploy, validar:
  - `/api/health`
  - `/api/db-health`
  - 1 fluxo crítico manual (login + operação relevante)

## Controles técnicos relacionados

- CI workflow: `.github/workflows/ci.yml`
- Scripts de teste e lint: `package.json`
- Config Jest: `jest.config.js`, `jest.e2e.config.js`
- Validação de env: `src/lib/env-validation.ts`
- Migrações Prisma: `prisma/migrations/**` e `scripts/vercel-migrate.js`

## Roadmap / futuro (não implementado como realidade atual)

- Habilitar Code Scanning no GitHub e impor branch protection com required checks.
- Introduzir secret scanning e detecção automática de credenciais em CI.
- Adicionar suites E2E de browser (Playwright) como gate de merge (se aplicável).

