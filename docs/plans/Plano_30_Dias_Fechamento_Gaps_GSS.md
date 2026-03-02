# Plano de 30 dias — Fechamento de Gaps (Fase A) — GlobalSecureSend (GSS)

## Objetivo

Executar, em 30 dias, a implementação mínima auditável das políticas e procedimentos definidos no GAP Pack, usando as checklists consolidadas (KYC, Autenticação, Logs/Retenção, Monitorização/Incidentes, Terceiros, SDLC).

## Premissas

- O foco é Fase A (front-end com terceiros; sem licença própria), com governança proporcional.
- O resultado esperado é “inspection-ready” no nível documental e operacional mínimo: políticas aprovadas, registros e evidências iniciadas, e rotinas implantadas.

## Sprint 1 (Dias 1–7): Documentos finais e governança mínima

### KYC

- Definir matriz de risco low/medium/high com critérios objetivos.
- Formalizar critérios de países suportados, restritos e proibidos.
- Definir rotina de KYC refresh por nível de risco e gatilhos por evento.

### Autenticação / Sessão

- Definir política de senhas (requisitos, bloqueios, reuse, resets).
- Definir quando MFA/2FA é obrigatório (admin e ações sensíveis).
- Documentar processo seguro de troca/recuperação de número de telefone.

### Logs / Retenção

- Definir catálogo de eventos obrigatórios (auth, KYC, OTP/2FA, admin, integrações).
- Definir matriz de retenção por tipo de log/dado (incluindo AML 5 anos).
- Definir processo de legal hold e preservação.

### Monitorização / Incidentes

- Definir lista de alertas mínimos e severidades.
- Definir RACI e escalonamento.
- Definir SLAs de triagem/contensão/comunicação por severidade.

### Terceiros

- Criar inventário de terceiros e classificar criticidade.
- Definir checklist de due diligence.

### SDLC

- Definir baseline de release pack (mudanças, evidência de testes, aprovações, rollback).
- Formalizar segregação de ambientes e controles de configuração.

### Entregáveis Sprint 1

- Políticas e procedimento aprovados internamente (versão 1.0).
- RACI formal (nomes e backups).
- Outsourcing register inicial.
- Matriz de retenção v1.

## Sprint 2 (Dias 8–14): Operação mínima e evidências recorrentes

### KYC

- Implementar workflow de exceções com justificativa, aprovação e validade (processual).
- Definir procedimento operacional de re-submissão e tratamento de falhas do fornecedor.

### Autenticação / Sessão

- Estabelecer lockout e proteção contra brute force/credential stuffing (definir parâmetros e evidência).
- Definir revisão periódica de acessos e remoção (joiner/mover/leaver).
- Definir “break-glass” e evidência de revisão posterior.

### Logs / Retenção

- Definir perfis de acesso a logs e auditar acesso aos próprios logs.
- Definir controles de integridade/imutabilidade para trilhas críticas (mínimo viável).

### Monitorização / Incidentes

- Criar runbooks por cenário (ATO, queda de fornecedor, falha KYC em massa, suspeita de fraude).
- Definir critérios e templates de comunicação.

### Terceiros

- Definir requisitos contratuais mínimos (SLA, incident notification, right-to-audit, exit).
- Definir processo de gestão de mudanças do fornecedor.

### SDLC

- Definir processo de atualização de dependências críticas e gestão de vulnerabilidades.
- Definir exceções de change (urgentes) com prazo e justificativa.

### Entregáveis Sprint 2

- Runbooks publicados e aprovados.
- Templates de comunicação.
- Processo joiner/mover/leaver e break-glass documentados.
- Processo mínimo de vuln/dependency management definido.

## Sprint 3 (Dias 15–21): Rotinas, revisões e simulado (tabletop)

### KYC

- Executar revisão semanal do funil KYC (falhas, pendências, backlog) e registrar evidência.
- Definir procedimento de STR/SAR e escalonamento para MLRO (versão operacional mínima).

### Logs / Retenção

- Rodar a primeira revisão periódica de logs e registrar evidência (relatório/ticket).

### Monitorização / Incidentes

- Executar 1 tabletop: cenário de ATO e cenário de queda de fornecedor.
- Registrar post-mortem e ações corretivas.

### Terceiros

- Rodar revisão de desempenho/risco para fornecedores críticos e registrar evidência.
- Criar exit plan básico por fornecedor crítico.

### SDLC

- Executar um release pack completo para uma release real ou simulada (end-to-end).

### Entregáveis Sprint 3

- Evidência de rotinas (revisões e tabletop).
- Exit plans v1 para fornecedores críticos.
- Release pack de referência.

## Sprint 4 (Dias 22–30): Consolidação e fechamento do dossiê de evidências

### KYC

- Preparar política de onboarding PJ/UBO com pré-requisitos e gatilhos (documental), mesmo que não habilitado.

### Autenticação / Sessão

- Consolidar métricas de auth/abuso e registrar baseline.

### Logs / Retenção

- Consolidar matriz de retenção e validar bases legais com jurídico (quando aplicável).

### Monitorização / Incidentes

- Validar escalonamento com fornecedores e SLAs de notificação.

### Terceiros

- Consolidar documentação de due diligence e contratos/termos essenciais.

### SDLC

- Consolidar processo de change management e auditoria (templates, aprovações, evidências).

### Entregáveis Sprint 4

- Dossiê final de evidências (políticas + registros + revisões + tabletop + release pack).
- Lista de riscos residuais e roadmap pós-30 dias.

## Limitações e próximos passos

- Algumas práticas avançadas (SIEM completo, WORM formal, screening contínuo robusto, onboarding PJ operacional) exigem maturação além de 30 dias e devem seguir o roadmap B/C.
