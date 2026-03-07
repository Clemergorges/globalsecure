# Contrato esperado (Emissor/TSP) para Claim Link

## Objetivo
Substituir o “modo demonstração” (PAN/CVC fake) por dados reais/tokenizados fornecidos pelo emissor/TSP, mantendo o UI atual.

Este documento define o JSON mínimo esperado para:
- Renderizar dados do cartão após desbloqueio no destinatário (`/claim/[token]`)
- Revelar dados do cartão no dashboard (`/dashboard/cards` → modal “Ver Dados”)
- Futuro: push provisioning Apple Pay / Google Pay (não implementado agora)

## Princípios
- Nunca persistir PAN/CVC no nosso banco.
- Preferir dados tokenizados (ephemeral keys / one-time reveal) e expiração curta.
- O backend atual não deve ter contratos quebrados; qualquer evolução entra como endpoints novos ou respostas adicionais compatíveis.

## 1) Endpoint de “reveal” (server-to-server) — recomendado
### 1.1 Requisição
`POST /issuer/cards/reveal`

Body (server-to-server):
```json
{
  "card_ref": "string",
  "purpose": "claim_recipient|dashboard_reveal",
  "request_id": "uuid",
  "scopes": ["pan", "cvc"],
  "expires_in_seconds": 300
}
```

### 1.2 Resposta
```json
{
  "status": "ok",
  "card": {
    "pan": "4111111111111111",
    "cvc": "123",
    "exp_month": 12,
    "exp_year": 2028,
    "brand": "visa",
    "last4": "1111"
  },
  "ttl_seconds": 300,
  "audit": {
    "issuer_trace_id": "string"
  }
}
```

## 2) Endpoint de “push provisioning” (Apple Pay / Google Pay) — fase 2
### 2.1 Requisição
`POST /issuer/cards/push-provisioning/session`

Body:
```json
{
  "card_ref": "string",
  "wallet": "apple_pay|google_pay",
  "device": {
    "device_id": "string",
    "device_type": "ios|android"
  },
  "purpose": "claim_recipient"
}
```

### 2.2 Resposta
Exemplo genérico (varia por TSP):
```json
{
  "status": "ok",
  "wallet": "apple_pay",
  "provisioning": {
    "encrypted_pass_data": "base64",
    "activation_data": "base64",
    "ephemeral_public_key": "base64"
  }
}
```

## 3) Mapeamento para o UI atual
### 3.1 `/claim/[token]` (destinatário)
O componente [ClaimClient.tsx](file:///C:/GlobalSecure2026!/globalsecuresend/src/app/claim/%5Btoken%5D/ClaimClient.tsx) hoje usa:
- `fakePan`
- `fakeCvc`
- `expMonth/expYear`

Substituição esperada:
- `pan` → mostrar/ocultar e copiar
- `cvc` → mostrar/ocultar e copiar
- `exp_month/exp_year` → exibir validade

### 3.2 `/dashboard/cards` (modal “Ver Dados”)
O modal atual já exibe PAN e CVC quando o endpoint retorna `pan` e `cvv`.
O contrato acima deve ser adaptado pelo backend para manter o formato atual do UI, por exemplo:
```json
{ "pan": "...", "cvv": "..." }
```

## 4) Identificadores necessários
Hoje o Claim Link guarda `virtualCardId` e o cartão tem `stripeCardId`/`transferId`.
Para integrar um emissor real, precisamos de um `card_ref` estável (ex.: `issuerCardId`) associado ao VirtualCard.

## 5) Requisitos de segurança (mínimo)
- `ttl_seconds` curto (ex.: 60–300s).
- Rate limiting por usuário e por cartão no backend.
- Auditoria obrigatória de “reveal” e provisioning.
- Bloqueio em tentativas excessivas de desbloqueio (backend).

