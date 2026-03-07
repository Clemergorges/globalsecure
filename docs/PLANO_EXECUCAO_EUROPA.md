# Plano de Execução: GlobalSecureSend (Versão Revisada & Completa)

Este documento detalha o roteiro técnico para transformar o MVP atual em um banco digital robusto, focado no mercado europeu (base EUR) com suporte global (BRL/PIX), incorporando auditoria de segurança, UX e operações.

**Score Inicial:** 51/100 (Bom começo, mas incompleto)
**Meta:** 100/100 (Pronto para Beta Launch)

---

## 📅 Cronograma Revisado

### **Sprint 0: Setup Essencial (ja)**
*Foco: Observabilidade e Infraestrutura*
- [ ] **Observabilidade:** Configurar Sentry (Error Tracking) e Logs Estruturados (Pino/Winston).
- [ ] **CI/CD:** Pipeline GitHub Actions para testes e deploy automático em Staging.
- [ ] **Banco de Dados:** Configurar backups automáticos (Point-in-time recovery) e Staging DB.
- [ ] **Ambiente:** Separar variáveis de ambiente (Dev, Staging, Prod).

### **Sprint 1: Fundação Financeira (depos do ja)**
*Foco: Correção de Bugs e Ledger Unificado*
- [ ] **Unified Ledger:** Criar tabela `UserTransaction` (Fonte única da verdade).
- [ ] **Correção de Bugs:**
    - [ ] PIX aparecendo no Dashboard (lendo de `UserTransaction`).
    - [ ] Saldo Multi-moeda (Conversão BRL->EUR visual).
    - [ ] Auditoria de i18n (Strings faltantes).
- [ ] **UX Básica:** Implementar Skeleton Loaders e Toast Notifications (Sonner).

### **Sprint 1.5: Segurança Crítica (depois do ja ja )**
*Foco: Proteção e Compliance*
- [ ] **Audit Logs:** Implementar tabela `AuditLog` para rastrear todas as ações sensíveis.
- [ ] **Rate Limiting:** Proteger endpoints de Auth e Transações (Redis).
- [ ] **Gestão de Sessão:** Timeout por inatividade e Device Fingerprinting.
- [ ] **Legal:** Páginas de Termos de Uso, Política de Privacidade e Consentimento de Cookies (GDPR).

### **Sprint 2: Core Banking & Cartões (jajajaja
)**
*Foco: Funcionalidades Bancárias*
- [ ] **Cartões Virtuais:** Schema `Card`, integração mock/provider, visualização de dados sensíveis (com 2FA).
- [ ] **FX Service:** Conversor de moedas com Cache Redis e Histórico de Taxas (`FxRateHistory`).
- [ ] **KYC Flow:** Verificação de identidade (Onfido/Sumsub integration) e Níveis de Conta.
- [ ] **Admin Dashboard (MVP):** Visualização de usuários e aprovação manual de KYC.

### **Sprint 3: Experiência do Usuário (Semana 3-3.5)**
*Foco: Engajamento e Mobile*
- [ ] **Analytics:** Gráficos de gastos (Pizza/Linha) por categoria.
- [ ] **PWA:** Manifest, Service Workers, UX Mobile-first.
- [ ] **Extratos:** Geração de PDF (React-PDF/PDFKit).
- [ ] **Features Extras:**
    - [ ] Cofrinhos (Savings Goals).
    - [ ] Dark Mode completo.
    - [ ] Modal de Detalhes da Transação.

### **Sprint 4: Escala e Operações ()**
*Foco: Performance e Robustez*
- [ ] **Performance:** Índices de Banco de Dados (`@@index`), Otimização de Queries.
- [ ] **Monitoramento:** Health Checks (`/api/health`), Métricas de Negócio.
- [ ] **Features Avançadas:**
    - [ ] Pagamentos Recorrentes.
    - [ ] Limites de Gastos Personalizáveis.
    - [ ] Split Bills.

### **Sprint 5: Beta Launch )**
*Foco: Lançamento Seguro*
- [ ] **Auditoria Externa:** Pen-test de segurança.
- [ ] **Stress Testing:** Testes de carga (K6).
- [ ] **Soft Launch:** Liberação para Beta Testers.

---

## 🛠️ Schemas de Banco de Dados (Adições)

### 1. Auditoria e Segurança
```prisma
model AuditLog {
  id        String      @id @default(uuid())
  userId    String
  action    AuditAction // LOGIN, TRANSFER, CARD_CREATE, SECURITY_UPDATE
  ip        String
  userAgent String?
  metadata  Json?       // Detalhes (ex: valor da transação, erro)
  createdAt DateTime    @default(now())
  
  user      User        @relation(fields: [userId], references: [id])
  
  @@index([userId, createdAt])
  @@index([action, createdAt])
}

enum AuditAction {
  LOGIN
  LOGOUT
  TRANSFER_CREATED
  CARD_ISSUED
  PASSWORD_CHANGED
  KYC_SUBMITTED
  SUSPICIOUS_ACTIVITY
}
```

### 2. Transações Unificadas
```prisma
model UserTransaction {
  id          String            @id @default(uuid())
  userId      String
  walletId    String
  type        TransactionType   // PIX_IN, SEPA_IN, CARD_OUT, TRANSFER, FX
  amount      Decimal
  currency    String            // Moeda original
  status      TransactionStatus // PENDING, COMPLETED, FAILED
  metadata    Json?             // Banco origem, merchant, categoria
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  
  user        User              @relation(fields: [userId], references: [id])
  wallet      Wallet            @relation(fields: [walletId], references: [id])

  @@index([userId, createdAt])
  @@index([type, status])
}
```

### 3. KYC e Compliance
```prisma
model KycVerification {
  id              String    @id @default(uuid())
  userId          String    @unique
  level           KycLevel  @default(BASIC)
  status          KycStatus
  documentType    String?
  verificationId  String?   // ID do provedor (Onfido)
  rejectionReason String?
  submittedAt     DateTime?
  approvedAt      DateTime?
  
  user            User      @relation(fields: [userId], references: [id])
}

enum KycLevel {
  BASIC     // Limite baixo
  ADVANCED  // Limite alto
  PREMIUM   // Ilimitado
}
```

### 4. Features Financeiras (Savings & Limits)
```prisma
model SavingsGoal {
  id            String    @id @default(uuid())
  userId        String
  walletId      String
  name          String
  targetAmount  Decimal
  currentAmount Decimal   @default(0)
  deadline      DateTime?
  emoji         String?
  createdAt     DateTime  @default(now())
  
  user          User      @relation(fields: [userId], references: [id])
}

model SpendingLimit {
  id        String      @id @default(uuid())
  userId    String
  type      LimitType   // OVERALL, CATEGORY, MERCHANT
  period    LimitPeriod // DAILY, MONTHLY
  amount    Decimal
  spent     Decimal     @default(0)
  resetAt   DateTime
  
  user      User        @relation(fields: [userId], references: [id])
}
```

---

## 🚀 Próximos Passos Imediatos

1.  **Executar Sprint 0:** Configurar Sentry e CI/CD.
2.  **Atualizar Schema Prisma:** Aplicar os novos modelos definidos acima.
3.  **Refatorar Dashboard:** Implementar leitura de `UserTransaction`.
