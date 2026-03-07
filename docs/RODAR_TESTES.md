# Rodar Testes — Guia Rápido

## Passos
- Instalar dependências:
```bash
npm install
```
- Preparar banco:
```bash
npx prisma db push
```
- Rodar todas as fases:
```bash
npm run test:all
```

## Foco por Fase
- Fase 1: `npm run test:unit`
- Fase 2: `npm run test:integration`
- Fase 3: `npm run test:e2e`
- Fase 4: `npm run test:failure`
