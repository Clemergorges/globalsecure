# GlobalSecureSend (MVP)

> **DISCLAIMER: AMBIENTE DE DEMONSTRAÇÃO**
> Este projeto é um **MVP (Minimum Viable Product)** apenas para fins de demonstração técnica e educacional.
> - **NENHUM DINHEIRO REAL** é processado. Todas as transações usam moedas fictícias ou redes de teste (Testnet).
> - **NÃO É UM BANCO** nem uma instituição financeira licenciada.
> - Não insira dados pessoais reais ou cartões de crédito válidos.

Plataforma financeira híbrida que une serviços bancários tradicionais (Fiat) com a eficiência da blockchain (Crypto), focada em nômades digitais e empresas globais.

##  Documentação Pública
- [Termos de Uso](./TERMS.md)
- [Política de Privacidade](./PRIVACY.md)
- [Whitepaper Técnico](./WHITEPAPER.md)

##  Funcionalidades Principais
- **Contas Multi-moeda:** EUR, USD, GBP.
- **Cartões Virtuais:** Integração com Stripe Issuing.
- **Cripto (Polygon):** Depósitos em USDT com conciliação automática.
- **Compliance:** KYC/AML automatizado e seguro.
- **Segurança:** Autenticação 2FA, Sessões seguras, Logs de auditoria.

##  Stack Tecnológica
- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL (Supabase) + Prisma ORM
- **UI:** TailwindCSS + ShadcnUI
- **Blockchain:** Ethers.js + Polygon Amoy (Testnet)
- **Infra:** Vercel (Serverless + Cron Jobs)

##  Arquitetura do Sistema

```mermaid
graph TD
    User[Cliente] --> Frontend[Next.js 15 App]
    Frontend --> API[API Routes / Server Actions]
    
    subgraph "Core Backend"
        API --> Prisma[Prisma ORM]
        Prisma --> DB[(Supabase PostgreSQL)]
        API --> Queue[Vercel Cron / Jobs]
    end
    
    subgraph "Serviços Externos"
        API --> Stripe[Stripe API (Fiat)]
        API --> Polygon[Alchemy RPC (Crypto)]
        API --> Pusher[Pusher (Realtime)]
        API --> Storage[Supabase Storage (KYC)]
    end
```

##  Segurança & Compliance
Implementamos práticas de segurança de nível bancário desde o MVP:
- **Ledger Atômico (ACID):** Todas as transações financeiras usam `prisma.$transaction` para garantir consistência total.
- **Zero-Trust Storage:** Documentos de KYC são armazenados em buckets privados com URLs assinadas temporárias (15 min).
- **Autenticação Robusta:** Sessões seguras via Cookies HttpOnly e suporte a 2FA.
- **Auditoria:** Logs imutáveis de todas as operações sensíveis.

##  Roadmap (2026)
- [x] **Q1:** MVP Sandbox (Web)
    - [x] Contas Multi-moeda & Câmbio
    - [x] Integração Cripto (Depósito Polygon)
    - [x] KYC Seguro
- [ ] **Q2:** Expansão Técnica
    - [ ] Saques Cripto Automatizados
    - [ ] KYC Automatizado (Stripe Identity)
    - [ ] App Mobile (React Native)
- [ ] **Q3:** Operação Real
    - [ ] Parceria com EMI/PI Licenciada
    - [ ] Lançamento Beta Fechado (Friends & Family)
- [ ] **Q4:** Escala Global
    - [ ] Lançamento Público

##  Como Rodar Localmente

1. **Instalar dependências:**
```bash
npm install
```

2. **Configurar variáveis de ambiente:**
Copie o arquivo `.env.example` para `.env` e preencha as chaves (Supabase, Stripe, etc).

3. **Configurar Banco de Dados:**
```bash
npx prisma db push
npx prisma db seed
```

4. **Rodar o servidor:**
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

##  🧪 Running Failure Tests (Fase 4)
```bash
npm run test:failure
```
Cobertura:
- duplicated webhooks
- out-of-order blockchain events
- external API timeouts
- Stripe failures
- crypto reverts
- insufficient balance
- KYC limit violations

##  🧪 Running All Tests (Full EMI Validation)
```bash
npm run test:all
```
Executa:
- Fase 1
- Fase 2
- Fase 3
- Fase 4

##  Por que isso importa para auditoria EMI
- Comando único que valida o sistema
- Logs consistentes
- Execução determinística
- Testes isolados por categoria
- Documentação clara

##  🚀 CI/CD Pipeline
Este projeto utiliza GitHub Actions para integração contínua. A pipeline executa automaticamente todos os testes (Unitários, Integração, E2E e Falha) a cada push ou pull request na branch main.
- **Workflow:** `.github/workflows/ci.yml`
- **Ambiente:** Node.js 20 + PostgreSQL Service Container
- **Validação:** Linting + Testes Automatizados (Fases 1-4)


##  Contribuição & Feedback
Este é um projeto de código fechado (proprietário), mas estamos abertos a feedback de investidores e parceiros tecnológicos.
Entre em contato para solicitar acesso ao ambiente de demonstração ou para discutir parcerias.

---
**Status:** MVP Pronto para Testes (Fevereiro 2026)
