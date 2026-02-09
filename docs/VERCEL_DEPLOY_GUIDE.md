# Deploy no Vercel com Domínio Customizado

## 1. Preparação do Ambiente

```bash
# Configure suas variáveis de ambiente no Vercel Dashboard
# ou use o arquivo .env.local para testes locais

# Variáveis necessárias:
DATABASE_URL=postgresql://usuario:senha@host:5432/globalsecuresend
DIRECT_URL=postgresql://usuario:senha@host:5432/globalsecuresend
JWT_SECRET=sua-chave-secreta-jwt
STRIPE_SECRET_KEY=sk_live_sua_chave_stripe
NEXTAUTH_URL=https://seudominio.com
REDIS_URL=redis://default:senha@redis-host:6379
```

## 2. Configuração do Vercel

```bash
# Instale o CLI do Vercel
npm i -g vercel

# Faça login na sua conta
vercel login

# Configure o projeto
vercel

# Quando solicitado:
# - Set up and deploy: Yes
# - Which scope: Sua conta/organização
# - Link to existing project: No
# - Project name: globalsecuresend
# - Directory: ./ (ou o diretório atual)
```

## 3. Configuração de Domínio Customizado

### Opção A: Via Dashboard Vercel
1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá para "Settings" → "Domains"
4. Adicione seu domínio: `seudominio.com`
5. Siga as instruções de DNS

### Opção B: Via CLI
```bash
# Adicione seu domínio
vercel domains add seudominio.com

# Verifique status
vercel domains inspect seudominio.com
```

## 4. Configuração DNS

### Para domínio raiz (exemplo.com):
```
Tipo: A
Nome: @
Valor: 76.76.19.61
TTL: 3600
```

### Para subdomínio (www.exemplo.com ou app.exemplo.com):
```
Tipo: CNAME
Nome: www (ou app)
Valor: cname.vercel-dns.com
TTL: 3600
```

## 5. SSL Automático
O Vercel fornece SSL automático via Let's Encrypt para todos os domínios customizados.

## 6. Configuração Final do Projeto

```json
// vercel.json atualizado
{
  "crons": [
    {
      "path": "/api/cron/reconcile-ledger",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/process-queue",
      "schedule": "0 1 * * *"
    }
  ],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

## 7. Deploy Final

```bash
# Deploy para produção
vercel --prod

# Ou configure deploy automático via GitHub
# Cada push para a branch main dispara deploy
```

## 8. Verificação

```bash
# Verifique se está funcionando
curl -I https://seudominio.com/api/health

# Deve retornar: HTTP/2 200
```

## Notas Importantes:

1. **Banco de Dados**: Você precisa de um banco PostgreSQL externo (Supabase, Neon, ou RDS)
2. **Redis**: Use Upstash Redis (gratuito) ou Redis Cloud
3. **Stripe**: Configure webhooks para o domínio customizado
4. **Email**: Configure SendGrid ou similar para emails de produção

## Comandos Úteis:

```bash
# Ver logs
vercel logs

# Redeploy
vercel --force

# Rollback
vercel rollback

# Ver variáveis de ambiente
vercel env ls
```
