# Simulações, Testes Operacionais e Métricas (TI/Sec)

Este documento define simulações de resiliência e segurança para suportar auditorias (DORA/GDPR/PSD2) e maturidade operacional.

## 0) Status atual (preenchido)
- Data de referência: 2026-02-16
- Evidência automatizada disponível: `jest-results.json` (Jest CI)
  - Suites: 28/36 passaram (77,8%)
  - Testes: 124/160 passaram (77,5%)
  - Principal causa das falhas: limite de conexões do banco em Session mode (`MaxClientsInSessionMode ... pool_size`)
- Simulações tabletop abaixo: ainda não executadas formalmente (métricas operacionais pendentes de medição)

## 1) Simulações (tabletop) recomendadas

### 1.1 Incidente: comprometimento de segredo (Stripe / RPC / SMTP)
- **Objetivo**: medir tempo de contenção e rotação.
- **Cenário**: suspeita de vazamento de `STRIPE_SECRET_KEY` ou `WALLET_PRIVATE_KEY`.
- **Passos**
  1. Identificar superfícies afetadas.
  2. Rotacionar segredos na Vercel e provedores.
  3. Validar webhooks e endpoints críticos.
  4. Auditoria: confirmar que nenhum segredo foi logado.
- **Métricas**
  - MTTA (detecção): N/D (simulação não executada)
  - MTTR (recuperação): N/D (simulação não executada)
  - % endpoints validados após rotação: 0% (não executado)

### 1.2 Incidente: falha de webhook (Stripe)
- **Objetivo**: garantir idempotência e reprocessamento seguro.
- **Cenário**: webhooks atrasados/duplicados.
- **Métricas**
  - % eventos duplicados ignorados por idempotência: N/D (simulação não executada)
  - % topups reconciliados sem intervenção manual: N/D (simulação não executada)

### 1.3 Ataque: brute force de código / abuso de endpoints críticos
- **Objetivo**: validar rate limiting e alertas.
- **Cenário**: múltiplas tentativas por IP.
- **Métricas**
  - % requests bloqueados (429): N/D (simulação não executada)
  - Tempo até alerta: N/D (simulação não executada)

### 1.4 Operação: indisponibilidade DB/Redis
- **Objetivo**: validar comportamento degradado e continuidade.
- **Cenário**: Redis fora (rate-limit fail-open), DB lenta/fora.
- **Métricas**
  - RTO real observado: N/D (simulação não executada)
  - RPO real observado: N/D (simulação não executada)

## 2) Testes de continuidade (BCP/DRP)
- Teste de restore do banco (mensal/trimestral).
- Teste de rotação de chaves (trimestral).
- Teste de failover de provedores (quando aplicável).

## 3) Scorecard (sem inventar números)
Preencha com resultados reais após cada simulação. Enquanto não houver simulações formais, este scorecard reflete apenas o estado atual (execução de testes automatizados).

| Categoria | Objetivo | Resultado | Evidência |
|---|---:|---:|---|
| Segredos | Rotacionar sem downtime crítico | N/D (não executado) | runbook + logs/prints |
| Webhooks | Idempotência sem double-credit | Parcial (testes CI 77,8% suites) | jest-results.json |
| Rate limit | Bloquear brute force | N/D (não executado) | métricas 429 + logs |
| DR | Restore bem-sucedido | N/D (não executado) | checklist + evidências |
