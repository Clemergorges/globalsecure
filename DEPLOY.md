
# 🚀 GlobalSecureSend - Guia de Deploy (Produção)

Este guia cobre o processo de deploy na infraestrutura recomendada: **Vercel** (Frontend/API), **NeonDB** (Database) e **Stripe** (Pagamentos).

## Pré-requisitos

1.  Conta na [Vercel](https://vercel.com).
2.  Conta na [Neon](https://neon.tech).
3.  Conta no [Stripe](https://stripe.com) (Ativada para Live Mode).
4.  CLI do Vercel instalada (opcional, mas recomendado): `npm i -g vercel`

---

## 1. Banco de Dados (NeonDB)

1.  Crie um novo projeto no Neon.
2.  Copie a **Connection String** (Pooled) do dashboard.
3.  Vá para o seu repositório local e rode a migração inicial para criar as tabelas no banco de produção:
    ```bash
    # Substitua pela URL do Neon
    DATABASE_URL="postgres://user:pass@ep-xyz.region.aws.neon.tech/globalsecuresend?sslmode=require" npx prisma migrate deploy
    ```

## 2. Configuração de Variáveis (Vercel)

1.  Importe o repositório do GitHub na Vercel.
2.  Nas configurações do projeto ("Settings" > "Environment Variables"), adicione as variáveis do arquivo `.env.production.example`:

| Variável | Descrição |
| :--- | :--- |
| `DATABASE_URL` | URL do Neon (Connection Pooling). |
| `DIRECT_URL` | URL do Neon (Direct Connection) para migrações. |
| `JWT_SECRET` | Gere com `openssl rand -base64 32`. |
| `STRIPE_SECRET_KEY` | Chave `sk_live_...` do Stripe. |
| `STRIPE_PUBLISHABLE_KEY` | Chave `pk_live_...` do Stripe. |
| `STRIPE_WEBHOOK_SECRET` | Configure o endpoint `/api/webhooks/stripe` no dashboard do Stripe e pegue o segredo `whsec_...`. |
| `NEXT_PUBLIC_PUSHER_KEY` | Chave pública do Pusher. |
| `PUSHER_APP_ID` | App ID do Pusher. |
| `PUSHER_SECRET` | Segredo do Pusher. |

## 3. Webhooks do Stripe

1.  No Dashboard do Stripe (Developers > Webhooks), adicione um endpoint apontando para sua URL da Vercel:
    *   URL: `https://seu-projeto.vercel.app/api/webhooks/stripe`
    *   Eventos para ouvir:
        *   `issuing_authorization.request`
        *   `issuing_transaction.created`
        *   `payment_intent.succeeded`

## 4. Deploy

1.  Faça o push para a branch `main` (ou `master`).
2.  A Vercel detectará o commit e iniciará o build automaticamente.
3.  Acompanhe o processo na aba "Deployments".

## 5. Verificação Pós-Deploy

1.  Acesse a URL de produção.
2.  Crie uma conta de usuário real.
3.  Verifique se o e-mail de boas-vindas (se configurado) chegou.
4.  Realize o KYC (Upload de documentos simulado).
5.  Teste uma transferência pequena (se tiver saldo real ou usar modo de teste do Stripe inicialmente).

## Solução de Problemas Comuns

*   **Erro de Conexão DB**: Verifique se está usando a URL "Pooled" do Neon (porta 6543 geralmente) para a variável `DATABASE_URL`.
*   **Webhook 400/500**: Verifique se o `STRIPE_WEBHOOK_SECRET` confere exatamente com o do dashboard live.
*   **Build Falhou**: Rode `npm run build` localmente para garantir que não há erros de TypeScript.
