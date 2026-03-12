# GSS — Third-Party Register (Internal)

Versão: 0.1

Data de criação: 2026-03-12

Data de última revisão: 2026-03-12

Responsável: (preencher)

## Objetivo

Manter um registro mínimo dos terceiros integrados à GSS, com uso, tipo de dado envolvido e observações de compliance.

## Escopo

- Fornecedores e serviços externos usados pelo backend, deploy e processos operacionais.

## Registro

| Fornecedor | Uso | Tipo de dados | Links de compliance | Observações |
|---|---|---|---|---|
| Vercel | Hosting/Serverless e logs de runtime | Técnico (logs), potencial PII em request logs | Roadmap: anexar links | Deploy do Next.js; logs usados na resposta a incidentes. |
| PostgreSQL (DB gerenciado) | Persistência de dados | PII, KYC, financeiro, técnico | Roadmap: anexar links | Usado via Prisma; tabela `AuditLog` armazena IP/UA quando fornecidos. |
| Stripe | Pagamentos/topups + Stripe Identity (KYC) + Issuing (beta) | Financeiro, KYC (via Identity), técnico | Roadmap: anexar links (PCI/SOC2) | Webhook validado por `STRIPE_WEBHOOK_SECRET`. |
| Supabase | Storage privado para documentos KYC | KYC (documentos) | Roadmap: anexar links | Usado por `src/lib/supabase.ts` e storage de KYC. |
| Alchemy | Webhooks de atividade on-chain (depósitos) | Técnico (txHash, addresses) | Roadmap: anexar links | Webhook validado por `ALCHEMY_WEBHOOK_SECRET`. |
| Polygon RPC (public/testnet) | Consulta/transação on-chain (USDT) | Técnico (addresses, tx) | Roadmap: anexar links | `POLYGON_RPC_URL` pode ser configurada; defaults podem apontar para RPC público/testnet. |
| CoinGecko | Preço de cripto (USD) | Técnico | Roadmap: anexar links | Usado para cotação; API key opcional conforme implementação. |
| Pusher | Eventos realtime para UI | Técnico, potencial PII minimizada | Roadmap: anexar links | Integração opcional; quando não configurado, não dispara eventos. |
| Slack | Alertas operacionais (webhook) | Técnico, potencial PII minimizada | Roadmap: anexar links | Usado em `src/lib/services/alert.ts`. |
| SMTP (provedor a definir) | Envio de e-mails (OTP, notificações) | PII (email), técnico | Roadmap: anexar links | Implementado via nodemailer; credenciais são env. |
| Sentry | Captura de erros (observabilidade) | Técnico, potencial PII se configurado | Roadmap: anexar links | Configs em `sentry.*.config.ts`. |
| Vercel Blob | Upload de documentos KYC (quando habilitado) | KYC (documentos) | Roadmap: anexar links | Usa `BLOB_READ_WRITE_TOKEN`. |
| Redis | Rate limiting/cache/fila (quando usado) | Técnico | Roadmap: anexar links | Dependência presente; uso deve ser revisado e padronizado. |

## Roadmap / futuro (não implementado como realidade atual)

- Provedor de SMS (Twilio ou equivalente) está previsto; atualmente o envio é stub/simulado (`src/lib/services/sms.ts`).
- Provedor dedicado de screening AML (sanctions/PEP/adverse media) ainda não está integrado.

