# Testes Locais — Guia Completo

## Pré-requisitos
- Node.js 20
- PostgreSQL local ou container

## Banco de Teste (Container)
```bash
docker run --name pg-test -e POSTGRES_PASSWORD=password -e POSTGRES_DB=globalsecure_test -p 5432:5432 -d postgres:15
```

## Ambiente
```bash
cp .env.test .env.local
```
Confirme DATABASE_URL para o banco de teste.

## Inicialização
```bash
npx prisma generate
npx prisma db push
```

## Executar Testes
```bash
npm run test:all
```

## Dicas
- Use `npm run test:failure` para focar na Fase 4.
- Logs e coverage são gerados no CI; localmente use `npm run test:ci` para coverage.
