# Política de Logs, Auditoria e Retenção — GlobalSecureSend (GSS)

## 1. Controle do documento

Documento: Política de Logs, Auditoria e Retenção — GSS

- Proprietário (Owner): Security Owner (Interim)
- Co-proprietário (Co-Owner): Compliance/MLRO (Interim)
- Aprovador: Direção/Board (Fase A)
- Data de vigência: 01/03/2026
- Versão: 1.0
- Classificação: Interno

### Histórico de revisões

| Data | Versão | Mudança principal | Responsável |
|---|---:|---|---|
| 01/03/2026 | 1.0 | Emissão inicial (data room ready) | Security Owner (Interim) |

## 2. Objetivo

Estabelecer uma política auditável para criação, armazenamento, acesso e retenção de logs e trilhas de auditoria, com foco em:

- Investigação de incidentes e forense.
- Accountability para inspeções e parceiros.
- Retenção mínima AML (≥ 5 anos) para evidências relevantes.
- Conformidade com princípios de privacidade (GDPR/LGPD) e minimização.

## 3. Escopo

Esta política cobre:

- Logs de aplicação e infraestrutura.
- Trilhas de auditoria de eventos críticos (incluindo eventos administrativos e AML).
- Logs de integrações com terceiros.

Não cobre em detalhe: desenho técnico de WORM/append-only e arquitetura de SIEM; tais itens são tratados como próximos passos quando aplicável.

## 4. Princípios

1) Minimização: coletar o mínimo necessário para segurança, operação e obrigações legais.

2) Integridade: logs devem ser protegidos contra alteração e acesso indevido.

3) Segregação: separar logs operacionais de trilhas AML/auditoria quando necessário.

4) Necessidade de saber: acesso apenas por perfis autorizados, com registro de acesso.

5) Retenção proporcional e baseada em obrigação legal e risco.

## 5. Catálogo mínimo de eventos

### 5.1 Autenticação e sessão

- Login/logout.
- Falhas de autenticação.
- Lockout/bloqueios e excedentes de rate limiting.
- Criação, renovação e revogação de sessão.
- Mudança de credenciais e fatores MFA.

### 5.2 Ações sensíveis

- Emissão e consumo de OTP para ações sensíveis.
- Troca de senha e alterações críticas de conta.
- Alterações de dados pessoais críticos (quando aplicável e proporcional).

### 5.3 KYC

- Início e progresso do fluxo de verificação.
- Mudanças de status (pendente, revisão, aprovado, recusado).
- Erros e falhas do fornecedor.
- Exceções e decisões manuais (quando existirem).

### 5.4 AML e compliance

- Gatilhos de regras (ex.: jurisdição de alto risco, padrões de velocidade).
- Criação/atualização/decisão de casos de revisão.
- Registros de bloqueios (holds) e liberações.

### 5.5 Integrações e terceiros

- Falhas de webhooks.
- Indisponibilidade/degradação de parceiros.
- Retries e quedas de SLA.

### 5.6 Administração (Backoffice)

- Ações administrativas (ex.: decisões AML, operações de tesouraria, consultas sensíveis).
- Consultas de logs/auditoria.
- Acessos privilegiados e ações de break-glass.

## 6. Campos mínimos e correlação

Cada evento relevante deve conter, quando aplicável:

- Data/hora (sincronizada por time source confiável).
- Identificador de usuário (ou identificador pseudonimizado quando apropriado).
- IP, user-agent e identificadores de correlação (request ID, session ID, event ID).
- Resultado (sucesso/falha) e código de status.
- Metadados mínimos necessários para investigação.

Dados sensíveis (ex.: senhas, OTPs, tokens) não devem ser registrados.

## 7. Armazenamento e proteção

### 7.1 Centralização

Logs devem ser centralizados em storage controlado pela GSS ou por fornecedor aprovado (conforme política de terceiros), com:

- Controle de acesso por papéis.
- Monitorização de disponibilidade e integridade.

### 7.2 Integridade e imutabilidade

- Trilhas críticas (AML/auditoria e ações administrativas) devem ter proteção reforçada contra alteração.
- Quando aplicável, usar mecanismos de append-only e/ou WORM para evidências regulatórias.

### 7.3 Confidencialidade

- Logs devem ser protegidos por criptografia em repouso e em trânsito, conforme viabilidade.
- Segregar ambientes (dev/test/prod) para evitar vazamento de dados e mistura de evidências.

## 8. Acesso e segregação

### 8.1 Perfis autorizados

Acesso a logs deve seguir o princípio de necessidade de saber. Exemplos:

- Operações: logs operacionais necessários para suporte.
- Segurança: logs de segurança e incident response.
- Compliance/MLRO: trilhas AML e decisões.
- Auditoria (interna ou terceira): acesso temporário e controlado.

### 8.2 Registro de acesso a logs

- Acesso a logs e exportações devem ser auditáveis.
- Consultas e downloads de logs críticos devem gerar registro.

### 8.3 Revisão de acessos

- Acessos a logs críticos devem ser revisados periodicamente.
- Revogações e mudanças devem ser registradas.

## 9. Retenção (matriz)

### 9.1 Princípios de retenção

- AML: evidências relevantes devem ser retidas por no mínimo 5 anos após o fim da relação/última transação relevante.
- Operacional: reter pelo tempo mínimo necessário para investigação e estabilidade.
- Segurança: reter tempo suficiente para detecção e investigação de ataques.

### 9.2 Matriz mínima (baseline)

Esta matriz deve ser refinada conforme perímetro e obrigações contratuais, mantendo o mínimo AML:

- Trilhas AML/KYC e decisões de compliance: ≥ 5 anos.
- Trilhas administrativas sensíveis (ex.: ações de tesouraria, decisões): 5 anos (ou maior, conforme governança).
- Logs de autenticação e segurança: 12–24 meses.
- Logs operacionais de aplicação (não críticos): 90–180 dias.
- Logs de infraestrutura e performance (não críticos): 30–90 dias.

## 10. Privacidade (GDPR/LGPD)

### 10.1 Bases legais

Logs e auditoria podem se fundamentar em:

- Obrigação legal (AML e retenções obrigatórias).
- Legítimo interesse/segurança e prevenção de fraude, quando aplicável.

### 10.2 Minimização e pseudonimização

- Evitar registrar conteúdo sensível.
- Usar mascaramento/pseudonimização quando possível sem comprometer investigação.

### 10.3 Direitos do titular

- Solicitações de titulares devem ser tratadas conforme procedimento de privacidade.
- Quando obrigação AML impedir exclusão/limitação, registrar a justificativa e base legal.

## 11. Legal hold e preservação

Quando houver investigação, incidente, disputa, inspeção ou solicitação de autoridade:

- Ativar legal hold para logs relevantes.
- Preservar cadeia de custódia e integridade.
- Documentar o escopo e a duração do hold.

## 12. Operação e evidência

### 12.1 Rotina de revisão

- Revisões periódicas (semanal/mensal) devem ocorrer conforme criticidade e risco.
- Devem existir evidências (tickets/atas/relatórios) das revisões e ações corretivas.

### 12.2 Indicadores

Indicadores mínimos:

- Taxas de falha de login e lockout.
- Picos de rate limit.
- Falhas de webhooks/terceiros.
- Eventos de incident response e tempos de resposta.

## 13. Limitações e próximos passos

1) Matriz de retenção detalhada: definir por evento/dado (inclui AML vs operacional) com validação jurídica.

2) Imutabilidade/WORM: definir arquitetura e controles, caso exigido por inspeções/contratos.

3) SIEM e correlação: formalizar pipeline de monitorização e alertas para logs críticos.

## 14. Evidências técnicas atuais

- `docs/TEST_REPORT.md` (índice de testes e evidências por área)
- `docs/SECURITY_TEST_REPORT.md` (segurança: sessão/auth, OTP/2FA, controles)
- `docs/KYC_STRIPE_2FA_REPORT.md` (fluxo KYC + 2FA/OTP e evidências)
- “GlobalSecureSend — Test Report (Validação Pré-Deploy)” (relatório pré-deploy)
- “Relatório Detalhado de Testes (Mapa de evidências)” (rastreabilidade de evidências)

## Anexo A — Baseline operacional (retenção e ferramentas alvo)

### A.1 Matriz de retenção (baseline)

Esta matriz é provisória e deve ser refinada por tipo de evento/dado e obrigação contratual. Mantém o mínimo de AML (≥ 5 anos) para evidências relevantes.

| Classe de log/trilha | Exemplo | Retenção baseline | Observações |
|---|---|---:|---|
| Trilhas AML/KYC e decisões de compliance | casos AML, decisões, status KYC | ≥ 5 anos | Obrigação AML; aplicar controles reforçados |
| Trilhas administrativas sensíveis | ações de tesouraria/admin | 5 anos | Pode aumentar conforme governança |
| Segurança e autenticação | login/logout, falhas, lockouts, 429 | 12–24 meses | Suporta investigação e tendências |
| Logs de integrações críticas | webhooks, falhas de parceiro | 12 meses | Ajustar por SLA/contrato |
| Logs operacionais (app) não críticos | rotas comuns | 90–180 dias | Minimização e custo |
| Infra/performance não críticos | métricas, traces básicos | 30–90 dias | Observabilidade e capacity |

### A.2 Ferramentas alvo (TODO de escolha)

- Logs de aplicação: Sentry (erros) + ELK/OpenSearch (logs estruturados) — TODO: escolher stack final
- Infra: CloudWatch (ou equivalente do provedor) — TODO: confirmar provedor-alvo
- Auditoria/AML: base transacional (Postgres) + export controlado (quando aplicável)
