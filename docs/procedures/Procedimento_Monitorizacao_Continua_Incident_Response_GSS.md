# Procedimento de Monitorização Contínua e Incident Response — GlobalSecureSend (GSS)

## 1. Controle do documento

Documento: Procedimento de Monitorização Contínua e Incident Response — GSS

- Proprietário (Owner): Security Owner (Interim)
- Co-proprietário (Co-Owner): Compliance/MLRO (Interim)
- Co-proprietário (Co-Owner): Operações (Interim)
- Aprovador: Direção/Board (Fase A)
- Data de vigência: 01/03/2026
- Versão: 1.0
- Classificação: Interno

### Histórico de revisões

| Data | Versão | Mudança principal | Responsável |
|---|---:|---|---|
| 01/03/2026 | 1.0 | Emissão inicial (data room ready) | Security Owner (Interim) |

## 2. Objetivo

Definir um procedimento operacional para:

- Monitorizar eventos críticos de segurança, operação e compliance.
- Detectar incidentes e responder de forma estruturada.
- Preservar evidências e manter trilha de decisões.
- Gerenciar comunicação com stakeholders, parceiros e autoridades quando aplicável.

## 3. Escopo e definições

### 3.1 Tipos de incidente

- Incidente de segurança: acesso não autorizado, vazamento, ATO, abuso de autenticação, malware.
- Incidente operacional: indisponibilidade, degradação de serviços, falhas de integrações.
- Incidente de compliance: falha de controles AML/KYC, incidentes relevantes a obrigações regulatórias.

### 3.2 Severidade (Sev)

- Sev 1 (Crítico): impacto alto em dados, fraude material, indisponibilidade geral, obrigação de notificação provável.
- Sev 2 (Alto): impacto relevante e persistente, mas contido.
- Sev 3 (Médio): impacto limitado, sem evidência de comprometimento amplo.
- Sev 4 (Baixo): evento menor, monitorado.

## 4. O que monitorar (fontes e indicadores)

### 4.1 Autenticação e sessão

- Picos de falhas de login.
- Excedentes de rate limiting.
- Lockouts e resets em volume.
- Eventos de OTP/MFA anômalos.

### 4.2 Abuso de OTP/2FA

- Solicitações repetidas em janela curta.
- Falhas de verificação em sequência.
- Padrões por IP/conta/dispositivo.

### 4.3 KYC

- Picos de falhas ou recusas.
- Pendências longas.
- Indisponibilidade do fornecedor.
- Inconsistências entre status do fornecedor e status interno.

### 4.4 Integrações e terceiros

- Falhas de webhooks (taxa e backlog).
- Aumento de latência.
- Erros de API de parceiros.
- Ativação de circuit breakers.

### 4.5 Dados e acessos

- Acessos administrativos fora do padrão.
- Exportações incomuns.
- Leitura massiva de dados.
- Ações de break-glass.

### 4.6 AML/Compliance (mínimo)

- Criação de casos de revisão (HIGH/CRITICAL).
- Bloqueios por risk gates.
- Tentativas de operar com casos abertos.

## 5. Alertas mínimos e thresholds (baseline)

Os thresholds abaixo são baselines e devem ser calibrados:

- Autenticação: taxa de falhas de login acima de baseline por 10–15 minutos.
- Rate limiting: número de 429 por IP/rota acima de baseline.
- OTP/2FA: solicitações acima de baseline por conta em janela curta.
- KYC: aumento abrupto de falhas/pendências; indisponibilidade do fornecedor.
- Webhooks: backlog crescente por janela definida.

Cada alerta deve ter:

- Severidade (Sev).
- Critério de disparo.
- Owner e escalonamento.
- Runbook associado.
- Política anti-fadiga (supressão/deduplicação quando aplicável).

## 6. Papéis e responsabilidades (RACI)

### 6.1 RACI

- Incident Commander (IC): coordena resposta e decisões (Security Owner ou delegado).
- Operações (On-call): triagem técnica e mitigação operacional.
- Engenharia: correção técnica e deploy quando necessário.
- Compliance/MLRO: avaliação de impacto regulatório/AML e decisões de compliance.
- Suporte: comunicação com cliente com scripts aprovados.
- Direção: decisões de risco, comunicação externa sensível e aprovações.

### 6.2 On-call

Definir regime de on-call proporcional (horário comercial com fallback; evoluir para 24/7 conforme risco e escala).

## 7. SLAs/tempos de resposta (baseline)

- Sev 1: triagem imediata; contenção inicial em até 60 min; update a cada 60 min.
- Sev 2: triagem em até 2h; contenção inicial em até 4h.
- Sev 3: triagem no mesmo dia útil; mitigação em até 3 dias úteis.
- Sev 4: registrar e endereçar em backlog.

## 8. Processo de resposta (fluxo padrão)

### 8.1 Detecção e registro

- Registrar incidente com ID, horário, descrição inicial e categoria.
- Identificar sistemas afetados e escopo preliminar.

### 8.2 Validação

- Confirmar se é incidente real ou falso positivo.
- Coletar evidências iniciais (logs, métricas, eventos).

### 8.3 Contenção

- Reduzir impacto e impedir escalada.
- Aplicar controles de degradação segura (ex.: bloquear operações sensíveis, pausar integrações, revogar sessões suspeitas).

### 8.4 Erradicação

- Remover causa raiz (vulnerabilidade, configuração, credenciais comprometidas).

### 8.5 Recuperação

- Restaurar serviços com validações.
- Monitorizar regressão.

### 8.6 Preservação de evidências

- Preservar logs e dados relevantes (legal hold quando necessário).
- Registrar cadeia de custódia.

## 9. Runbooks (passo a passo)

### 9.1 Runbook A — Suspeita de Account Takeover (ATO)

1) Confirmar sinais: picos de falha de login, alterações de credenciais, OTP anômalo.

2) Contenção:

- Revogar sessões do usuário afetado.
- Aplicar step-up e bloqueio temporário.
- Aumentar rate limiting para IPs suspeitos.

3) Investigar:

- Revisar trilhas de login e eventos de OTP.
- Verificar ações sensíveis recentes.

4) Comunicação:

- Notificar usuário com template aprovado (sem expor detalhes sensíveis).

5) Recuperação:

- Forçar redefinição de senha e re-enrolar MFA.

### 9.2 Runbook B — Queda/indisponibilidade de fornecedor crítico (ex.: KYC/SMS)

1) Confirmar falha (erros, latência, backlog, circuit breaker).

2) Contenção:

- Ativar degradação segura (não liberar funcionalidades que dependem do serviço).
- Aplicar comunicação de status.

3) Escalonar ao fornecedor:

- Abrir incidente e exigir ETA.

4) Operar com plano de continuidade:

- Reprocessar quando normalizar.
- Registrar impacto e decisões.

### 9.3 Runbook C — Falha de KYC em massa / pendências longas

1) Validar se é problema do fornecedor, integração ou UX.

2) Contenção:

- Evitar que usuários não verificados acessem funcionalidades sensíveis.

3) Remediação:

- Ajustar filas e reprocessamento.
- Monitorizar taxas e backlog.

4) Comunicação:

- Mensagens ao usuário com transparência e prazos.

### 9.4 Runbook D — Suspeita de fraude/abuso por regras AML

1) Confirmar gatilhos: jurisdição de alto risco, velocity, padrões.

2) Contenção:

- Aplicar hold/bloqueio de operações relevantes.
- Criar/atualizar caso AML para revisão.

3) Revisão:

- Compliance/MLRO decide e registra evidência.

4) Escalonamento:

- Se necessário, avaliar STR/SAR conforme procedimento.

### 9.5 Runbook E — Suspeita de violação de dados pessoais (Data breach)

1) Contenção imediata:

- Restringir acesso, rotacionar segredos, isolar sistema.

2) Avaliação de impacto:

- Quais dados, quantos titulares, risco.

3) Preservação:

- Legal hold de logs e evidências.

4) Notificações:

- Avaliar obrigação GDPR (72h) e obrigações contratuais.

5) Comunicação:

- Aprovação da Direção e Compliance.

## 10. Comunicação

### 10.1 Comunicação interna

- Atualizações por severidade, com cadência definida.
- Registro de decisões e aprovações.

### 10.2 Comunicação externa

- Clientes: linguagem clara, sem jargão; informar impacto e ações recomendadas.
- Parceiros: cumprir SLAs de notificação e fornecer evidência de investigação.
- Autoridades/DPAs: quando aplicável, conduzir via Compliance/MLRO e jurídico.

### 10.3 Templates

Manter templates aprovados para:

- Indisponibilidade de serviço.
- Suspeita de ATO.
- Notificação de incidente com impacto.
- Comunicação pós-incidente.

## 11. Pós-incidente

- Conduzir post-mortem (RCA) para Sev 1–2 (e Sev 3 quando relevante).
- Definir ações corretivas e preventivas, responsáveis e prazos.
- Atualizar políticas/controles e evidências.
- Registrar lições aprendidas.

## 12. Limitações e próximos passos

1) Thresholds e alertas: calibrar com dados reais e definir baseline por rota/serviço.

2) Evidência de exercícios (tabletop): executar e registrar ao menos um exercício trimestral (ou proporcional) na Fase A.

3) Integração com SIEM e automações: evoluir conforme maturidade e exigências de inspeção.

## 13. Evidências técnicas atuais

- `docs/TEST_REPORT.md` (índice de testes e evidências por área)
- `docs/SECURITY_TEST_REPORT.md` (segurança: sessão/auth, OTP/2FA, controles)
- `docs/KYC_STRIPE_2FA_REPORT.md` (fluxo KYC + 2FA/OTP e evidências)
- “GlobalSecureSend — Test Report (Validação Pré-Deploy)” (relatório pré-deploy)
- “Relatório Detalhado de Testes (Mapa de evidências)” (rastreabilidade de evidências)

## Anexo A — Thresholds iniciais (baseline) e responsáveis

Os thresholds abaixo são baselines iniciais e devem ser calibrados com dados reais. Cada item deve gerar alerta, ticket e registro de decisão quando aplicável.

| Alerta | Threshold (baseline) | Janela | Severidade inicial | Responsável (Owner) |
|---|---|---:|---|---|
| Login falho (pico) | ≥ 30 falhas/10 min (por rota) OU ≥ 10 falhas/10 min (por IP) | 10 min | Sev 2 | Incident Commander (Security Owner) |
| Rate limiting (429) | ≥ 200 respostas 429/10 min (por rota) OU ≥ 50/10 min (por IP) | 10 min | Sev 2 | Operações (On-call) |
| Falha de webhook (Stripe) | ≥ 5% de falhas/15 min OU backlog crescente sem recuperação | 15 min | Sev 2 | Operações (On-call) + Owner de Terceiros |
| Falha KYC (Stripe Identity) | ≥ 5% de falhas de criação/sync/15 min OU indisponibilidade do parceiro | 15 min | Sev 2 | Owner de Terceiros + Compliance/MLRO |
| Caso AML CRITICAL criado | ≥ 1 caso CRITICAL (novo) | imediato | Sev 2 | Compliance/MLRO |
