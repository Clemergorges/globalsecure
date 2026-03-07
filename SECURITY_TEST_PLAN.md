# Plano Completo de Testes de Segurança e Resiliência (Fintech Standard)

Este documento define a estratégia de garantia de qualidade, segurança e conformidade para o ecossistema GlobalSecureSend.

## 1. Objetivos e Estratégia
**Objetivo Primário:** Garantir a integridade financeira, conformidade regulatória (AML/KYC) e resiliência operacional da plataforma antes do lançamento (Go-Live).

**Pilares de Teste:**
1.  **Integridade Financeira:** Atomicidade de transações (ACID).
2.  **Segurança Ofensiva:** Resistência a fraudes e ataques.
3.  **Resiliência:** Capacidade de recuperação de falhas (DR).
4.  **Conformidade:** Aderência às regras de KYC e AML.

---

## 2. Cenários de Fraude e Abuso (AML/Fraud Prevention)

### 2.1. Fraude de Identidade (Onboarding)
| ID | Cenário | Descrição | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| **F1** | Documento Falso Simples | Envio de documento com formato inválido ou números aleatórios. | `KYCStatus = REJECTED`, Log `DOCUMENT_INVALID_FORMAT`. | ✅ |
| **F2** | Documento Expirado | Envio de documento com `expiryDate < now`. | Bloqueio imediato na API. | ✅ |
| **F3** | Identidade Duplicada | Uso do mesmo `documentNumber` em múltiplas contas. | Bloqueio por `Unique Constraint` + Alerta `POTENTIAL_DUPLICATE`. | ✅ |

### 2.2. Fraude Comportamental (Transaction Monitoring)
| ID | Cenário | Descrição | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| **F4** | Smurfing / Structuring | Múltiplas transações logo abaixo do limite (ex: 10x €490). | Detecção de padrão + Evento `SUSPICIOUS_ACTIVITY` + `KYC_REVIEW`. | 🔲 |
| **F5** | Abuso de Global Link | Criação massiva de links de pequeno valor em curto período. | Rate Limit específico + Congelamento temporário (`FROZEN`). | ✅ |
| **F6** | Auto-Financiamento | Envio repetido de Global Link para o próprio email. | Log de Risco + Alerta de AML. | 🔲 |

### 2.3. Fraude de Acesso (Account Takeover)
| ID | Cenário | Descrição | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| **F7** | Credential Stuffing | Ataque de força bruta no login. | Rate Limit (5 tentativas) + Lock temporário. | ✅ |
| **F8** | Login Atípico (Geo) | Login súbito de país de alto risco (ex: Rússia, Coreia do Norte). | Evento `UNUSUAL_LOCATION` + Exigência de 2FA. | 🔲 |
| **F9** | Token Replay | Reuso de JWT antigo ou roubado. | Rejeição por expiração/assinatura inválida. | ✅ |

### 2.4. Fraude em Global Link
| ID | Cenário | Descrição | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| **F10** | Link Expirado | Tentativa de resgate após 48h. | Bloqueio + Mensagem de erro clara. | ✅ |
| **F11** | Brute Force (Unlock Code) | Múltiplas tentativas de adivinhar o código. | Bloqueio do Link após 5 tentativas falhas. | 🔲 |
| **F12** | Double Spending | Tentativa de resgatar o mesmo link 2x. | Bloqueio na segunda tentativa (Atomicidade). | ✅ |

---

## 3. Testes de Resiliência e Disaster Recovery

### 3.1. Falhas de Infraestrutura
| ID | Cenário | Simulação | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **R1** | Queda de DB (Transação) | Desligar DB durante `prisma.$transaction`. | Rollback total (sem saldo perdido). |
| **R2** | Timeout de Email | Falha no envio do email do Global Link. | Transação revertida OU Link criado mas marcado para retry. |
| **R3** | Latência de Rede | Atraso de 10s na resposta da API. | Cliente trata timeout graciosamente (loading state). |

### 3.2. Recuperação de Desastres (DR)
| ID | Cenário | Procedimento | Validação |
| :--- | :--- | :--- | :--- |
| **DR1** | Restore de Backup | Restaurar snapshot D-1. | Ledger consistente, sem transações órfãs. |
| **DR2** | PITR (Point-in-Time) | Restaurar para 5 min atrás. | Perda mínima de dados, consistência mantida. |

---

## 4. Performance e Escalabilidade

### 4.1. Load Test (Carga Normal)
*   **Alvo:** 1.000 req/min em `/api/transfers`.
*   **Métrica:** Latência média < 200ms (p95).
*   **Erro:** Taxa de erro < 0.1%.

### 4.2. Stress Test (Ponto de Quebra)
*   **Alvo:** Aumentar carga até falha.
*   **Objetivo:** Identificar gargalo (CPU, DB Connections, Bandwidth).

---

## 5. Checklist de Conformidade Regulatória (EMI/PSD2)

### 5.1. Identidade & KYC
- [x] Separação estrita `User` vs `Account`.
- [x] `KYCStatus` e `AccountStatus` independentes.
- [x] Fluxo de Onboarding Progressivo.
- [ ] Logs detalhados de aprovação manual (Admin ID).

### 5.2. AML & Monitoramento
- [x] Limites financeiros por Nível KYC (0, 1, 2).
- [ ] Alertas automáticos de `SUSPICIOUS_ACTIVITY`.
- [x] Funcionalidade de Congelamento (`FROZEN`).

### 5.3. Segurança
- [x] 2FA (SMS/Email) implementado.
- [x] Rate Limiting em endpoints críticos.
- [x] Revogação de Sessão.

### 5.4. Dados (GDPR)
- [x] Criptografia de dados sensíveis em repouso.
- [x] Mascaramento de PAN/CVV nos logs.
- [x] Consentimento explícito (Termos de Uso).
- [ ] Mecanismo de "Direito ao Esquecimento" (Data Deletion).

---

## 6. Próximos Passos
1.  Automatizar testes dos cenários marcados como 🔲.
2.  Executar simulação de DR em ambiente de Staging.
3.  Agendar Pentest externo antes do Go-Live.
