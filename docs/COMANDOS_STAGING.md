# Comandos (Local + Staging)

Este documento reúne os comandos práticos para: rodar local, executar testes, aplicar migrações e validar o deploy em staging (Vercel + Supabase).

## Pré-requisitos

- Node.js e npm instalados
- Docker Desktop rodando (se for usar Postgres local em container ou rodar o app em container)
- Banco (Supabase staging ou Postgres local) acessível via `DATABASE_URL`

## Instalar dependências

```bash
npm ci
```

## Migrações (LOCAL)

O script abaixo usa `.env.local` por padrão (com override) para reduzir risco de apontar para DB errado:

```bash
npm run db:migrate
```

Se você quiser rodar explicitamente o comando “padrão” do Prisma (por exemplo em CI/produção, com `DATABASE_URL` já configurado no ambiente):

```bash
npm run db:migrate:prod
```

## Testes

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
```

## Subir o app (LOCAL)

```bash
npm run dev
```

Ou, para simular produção localmente:

```bash
npm run build
npm run start
```

## Seed de usuários DEMO (para smoke tests)

Cria/atualiza dois usuários “demo” e carrega saldos fiat para testar flows.

```bash
node scripts/seed-demo-users-docker.js
```

Credenciais geradas (fixas):

- `demo.sender@gss.local`
- `demo.recipient@gss.local`
- senha: `DEMO_PASSWORD` (defina em env; não versionar senha real)
- `card.external@gss.local` (email “sem conta” para testar fluxo de cartão)

## Toggle de flags operacionais (incident comms / kill switches)

Ativar/desativar flags no banco:

```bash
node scripts/set-operational-flag.js TREASURY_HALT_DEPOSITS_WITHDRAWS true
node scripts/set-operational-flag.js TREASURY_HALT_DEPOSITS_WITHDRAWS false

node scripts/set-operational-flag.js YIELD_ALLOCATIONS_PAUSED true
node scripts/set-operational-flag.js YIELD_ALLOCATIONS_PAUSED false
```

## Rodar tudo via Docker (opcional)

Se você estiver usando um Postgres em container na rede Docker `gss-local` e quiser rodar o app dentro do container builder (imagem `gss-builder`):

```bash
docker build --target builder -t gss-builder .
```

Exemplo de `next start` em porta 3002 (substitua URLs se necessário):

```bash
docker run --rm --network gss-local -p 3002:3002 \
  -e DATABASE_URL="postgresql://USER:PASS@HOST:5432/DB?schema=public" \
  -e DIRECT_URL="postgresql://USER:PASS@HOST:5432/DB?schema=public" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3002" \
  -e APP_BASE_URL="http://localhost:3002" \
  -e NODE_ENV="production" \
  gss-builder npx next start -p 3002
```

## Deploy STAGING (Vercel + Supabase) — checklist operacional

### 1) Preparar env vars no Vercel (staging)

Configurar todas as env vars atuais do projeto + as novas:

- `PARTNER_BREAKER_*` (circuit breaker)
- `YIELD_*` (proteções/reconciliação)
- `JURISDICTION_BLOCK_COUNTRIES` (lista de países bloqueados, ISO-3166 alpha-2, separado por vírgula)

Além disso:

- `DATABASE_URL` e `DIRECT_URL` apontando para o Supabase de staging
- Chaves externas em modo test/sandbox (Stripe etc.) no staging

### 2) Aplicar migrações no banco de staging

Rodar `prisma migrate deploy` com as env vars do staging carregadas (no CI/CD ou local):

```bash
npx prisma migrate deploy
```

### 3) Smoke tests mínimos em staging

- Login e dashboard
- Depósitos (ex.: `/dashboard/wallet/deposit`)
- P2P interno (`/dashboard/transfers/create`)
- Fluxo de cartão com `card.external@gss.local`
- Toggles de flags operacionais (banners) e bloqueio de yield ao pausar `YIELD_ALLOCATIONS_PAUSED`

## Freeze e tag de release

```bash
git checkout main
git merge <seu-branch>
git tag v1.0.0-regulated
git push origin main --tags
```
