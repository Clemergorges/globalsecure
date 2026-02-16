# Fluxo Claim (Cartão por Link)

## Objetivo
Permitir que um remetente envie um cartão virtual por e-mail/link para um destinatário que pode não ter conta bancária e não quer criar conta. O destinatário desbloqueia o cartão com um código enviado por canal seguro (fora do e-mail) e usa imediatamente.

## Componentes (UI e rotas)
- Remetente (logado):
  - Tela: `/dashboard/claim/create`
  - Acesso rápido: botão “Enviar Cartão” na home do dashboard
- Destinatário (público, sem login):
  - Tela: `/claim/[token]`
- APIs (não modificar contratos):
  - `POST /api/claim-links`
  - `POST /api/claim/[id]/unlock`
  - `GET /api/claim/[token]`
  - `POST /api/claim/[token]/unlock`

## Fluxo do remetente (passo a passo)
1. Acessa `/dashboard/claim/create`.
2. Preenche:
   - Valor
   - Moeda (ex.: EUR)
   - E-mail do destinatário
   - Mensagem (opcional)
3. Confirma “Criar e enviar”.
4. O frontend chama `POST /api/claim-links`.
5. Em sucesso, o remetente vê:
   - Confirmação do envio para o e-mail do destinatário
   - Link do claim (backup, para copiar)
   - Código de desbloqueio (para copiar)
6. O remetente deve enviar o código de desbloqueio ao destinatário por um canal seguro (ex.: WhatsApp, SMS, ligação).

## Fluxo do destinatário (passo a passo)
1. Recebe e-mail com o link do claim.
2. Abre `/claim/[token]`.
3. Vê o resumo:
   - “Você recebeu um cartão pré-pago GlobalSecureSend”
   - Valor/moeda
   - Tempo até expiração (quando aplicável)
4. A tela valida o token via `GET /api/claim/[token]` (dados públicos).
5. Digita o código de desbloqueio.
6. O frontend chama `POST /api/claim/[token]/unlock` (rate-limit por IP+token).
7. Em sucesso, vê a tela pós-desbloqueio:
   - Dados do cartão (PAN/CVC) retornam apenas uma vez
   - Botões “Adicionar ao Apple Pay” e “Adicionar ao Google Pay” (placeholder “Em breve”)
   - “Onde posso usar?” (explicação simples)

## Exibição no dashboard (remetente)
- Cartões (`/dashboard/cards`):
  - Cards gerados via claim aparecem com badge “Claim”
  - Mostra status: Pendente / Ativo / Expirado (conforme status do backend)
  - Mostra destinatário e expiração quando disponível
- Transações (`/dashboard/transactions`):
  - Seção “Envios via Cartão (Claim)” no topo (para visibilidade rápida)

## Limitações atuais (camada 2)
- Dados sensíveis do cartão dependem das permissões do Stripe Issuing:
  - Em produção, o backend tenta recuperar PAN/CVC via Stripe com `expand: ['number','cvc']` para cartões virtuais
  - Se o ambiente não permitir (permissão/conta/chave) ou em erro, o backend retorna dados mascarados/mock para não quebrar o fluxo
- Apple Pay / Google Pay:
  - Botões existem, mas exibem “Em breve” (sem push provisioning)
- Expiração:
  - Backend usa expiração fixa (hoje) e o frontend exibe `expiresAt` quando disponível
- Status “expirado por tempo”:
  - O bloqueio duro de expiração deve ser confirmado pelo status retornado do backend

## Segurança e UX (intencional)
- O código de desbloqueio não vai por e-mail (reduz risco de interceptação do e-mail).
- Tentativas de código no frontend são limitadas para UX; o bloqueio real deve ser imposto no backend/emissor.
- UI escrita para não-bancarizados:
  - passos numerados, linguagem simples, sem jargão

## Checklist rápido de teste (dev)
1. Logar no dashboard.
2. Criar claim em `/dashboard/claim/create`.
3. Confirmar que o e-mail do claim foi enviado.
4. Abrir `/claim/[token]` em aba anônima.
5. Inserir o código e verificar tela pós-desbloqueio.
6. Verificar badge e status em `/dashboard/cards` e seção em `/dashboard/transactions`.
