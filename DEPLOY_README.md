# GlobalSecureSend - Guia de Deploy 🚀

Este documento descreve os passos necessários para realizar o deploy da aplicação em produção.

## 🏗️ Requisitos Prévios

1.  **Node.js 20+**
2.  **Conta na Vercel** (ou servidor Docker/VPS)
3.  **Banco de Dados PostgreSQL** (Supabase, Neon, AWS RDS)
4.  **Contas de Serviço:**
    *   Stripe (Pagamentos)
    *   Twilio (SMS/2FA)
    *   Resend/SMTP (Email)
    *   Slack (Monitoramento)

---

## ☁️ Opção 1: Deploy na Vercel (Recomendado)

A Vercel é a plataforma nativa para Next.js e oferece a melhor performance.

### 1. Configuração do Projeto
1.  Importe o repositório do GitHub na Vercel.
2.  Framework Preset: **Next.js**
3.  Root Directory: `./` (raiz)

### 2. Variáveis de Ambiente
Copie o conteúdo de `.env.production.example` e preencha com seus valores reais no painel da Vercel (**Settings > Environment Variables**).

**Variáveis Críticas:**
*   `DATABASE_URL`: Connection string do pooler (porta 6543).
*   `DIRECT_URL`: Connection string direta (porta 5432) para migrações.
*   `JWT_SECRET`: Gere com `openssl rand -base64 32`.
*   `NEXTAUTH_SECRET`: Igual ao JWT_SECRET.
*   `SLACK_WEBHOOK_URL`: Para alertas de segurança.

### 3. Migrações de Banco
No momento do build, o Prisma precisa gerar o cliente. Adicione o seguinte **Build Command** na Vercel:
```bash
npx prisma generate && npx prisma migrate deploy && next build
```
*Isso garante que o banco esteja sempre sincronizado com o código.*

---

## 🐳 Opção 2: Deploy com Docker

Para deploy em infraestrutura própria (AWS EC2, DigitalOcean, Azure).

### 1. Build da Imagem
```bash
docker build -t globalsecuresend .
```

### 2. Execução
Crie um arquivo `.env` com as variáveis de produção e rode:
```bash
docker run -p 3000:3000 --env-file .env globalsecuresend
```

---

## 🛡️ Checklist Pós-Deploy

1.  **Acesse a URL de produção** e verifique se carrega sem erros.
2.  **Teste o Login/Registro** para validar conexão com banco e envio de emails.
3.  **Verifique os Logs** no dashboard da Vercel/Docker para garantir que não há erros de inicialização.
4.  **Teste o Webhook do Stripe** (se configurado) para garantir processamento de pagamentos.
5.  **Valide o Monitoramento**: O Slack deve receber um alerta de "System Startup" (se configurado).

---

## 🚨 Troubleshooting

*   **Erro 500 no Login:** Verifique `JWT_SECRET` e `DATABASE_URL`.
*   **Erro de Migração:** Certifique-se que `DIRECT_URL` aponta para a porta 5432 e o banco permite conexões externas.
*   **Timeouts:** Verifique se a região do Banco de Dados (ex: AWS eu-west-1) é a mesma do Serverless Function (Vercel).
