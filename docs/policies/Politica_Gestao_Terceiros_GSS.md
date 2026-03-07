# Política de Gestão de Terceiros (Outsourcing) — GlobalSecureSend (GSS)

## 1. Controle do documento

Documento: Política de Gestão de Terceiros (Outsourcing) — GSS

- Proprietário (Owner): Third-Party Owner (Interim)
- Co-proprietário (Co-Owner): Security Owner (Interim)
- Co-proprietário (Co-Owner): Compliance/MLRO (Interim)
- Aprovador: Direção/Board (Fase A)
- Data de vigência: 01/03/2026
- Versão: 1.0
- Classificação: Interno

### Histórico de revisões

| Data | Versão | Mudança principal | Responsável |
|---|---:|---|---|
| 01/03/2026 | 1.0 | Emissão inicial (data room ready) | Third-Party Owner (Interim) |

## 2. Objetivo

Definir regras e processo auditáveis para seleção, contratação, monitorização e encerramento de fornecedores e terceiros, com foco em:

- Risco operacional e de concentração.
- Segurança e privacidade.
- Continuidade e resiliência.
- Evidência compatível com expectativas de supervisão (CSSF/LHoFT) proporcional ao perímetro.

## 3. Escopo

Aplica-se a todos os fornecedores que suportam atividades relevantes, incluindo:

- KYC/identidade.
- SMS e autenticação.
- Storage e processamento de dados.
- BaaS e serviços financeiros integrados.
- Observabilidade/monitorização.
- Suporte e serviços profissionais.

## 4. Princípios

1) Responsabilidade: terceirização não elimina a responsabilidade de governança e evidência.

2) Proporcionalidade: nível de exigência depende de criticidade.

3) Transparência: manter inventário e documentação atualizada.

4) Resiliência: planejar falhas e saída (exit).

## 5. Inventário e classificação

### 5.1 Registro de terceiros

A GSS deve manter um registro (“outsourcing register”) com, no mínimo:

- Nome do fornecedor e serviço.
- Categoria (KYC, SMS, storage, etc.).
- Dados processados e finalidade.
- Localização primária de dados e transferências internacionais.
- Subcontratados relevantes (subprocessing).
- SLA/SLO e pontos de contato.
- Classificação de criticidade.
- Data de início, renovação e término.

### 5.2 Classificação de criticidade

Classificar como, no mínimo:

- Crítico/Importante: impacto direto em KYC/AML, autenticação, dados pessoais, disponibilidade essencial, ou obrigações regulatórias.
- Não crítico: impacto limitado e reversível.

Critérios: impacto em continuidade, dados sensíveis, obrigação legal, substituibilidade e risco de concentração.

## 6. Due diligence pré-contratação

Antes de contratar fornecedor crítico/importante, coletar evidência proporcional, incluindo:

- Segurança: práticas, controles, histórico de incidentes, e evidência disponível (ex.: relatórios de auditoria/certificações quando existirem).
- Privacidade: DPA, subprocessing, local de dados, transferências e bases legais.
- Resiliência: continuidade, redundância, RTO/RPO quando aplicável.
- Compliance: obrigações relevantes ao serviço (ex.: KYC/identidade).
- Capacidade de auditoria: transparência e cooperação em inspeções/incidentes.

Quando a evidência formal (certificações) não estiver disponível na Fase A, registrar o racional de aceitação e um plano de remediação.

## 7. Avaliação de risco

### 7.1 Dimensões mínimas

- Operacional (disponibilidade, performance, dependência).
- Segurança (vazamento, acesso indevido, vulnerabilidades).
- Privacidade (transferência internacional, subprocessing).
- Concentração e lock-in.
- Compliance (impacto AML/KYC e evidência).

### 7.2 Aprovação

- Fornecedores críticos exigem aprovação por Direção e parecer de Segurança e Compliance/MLRO.
- Exceções devem ser justificadas, com prazo e plano.

## 8. Contratos e cláusulas mínimas

Contratos com fornecedores críticos/importantes devem incluir, no mínimo:

- Escopo e níveis de serviço (SLA/SLO).
- Notificação de incidentes (prazos e canal) e cooperação.
- Direito de auditoria (direto ou por relatórios equivalentes).
- Requisitos de subcontratação (subprocessors) e aprovação.
- Requisitos de proteção de dados (DPA, confidencialidade, retenção e eliminação).
- Continuidade e recuperação.
- Plano de saída (exit) e obrigações no término.

## 9. Monitorização contínua

### 9.1 KPIs/KRIs

Definir KPIs/KRIs por fornecedor crítico, incluindo:

- Disponibilidade e latência.
- Taxa de falhas e retries.
- Backlog de eventos (ex.: webhooks).
- Incidentes e tempo de resolução.

### 9.2 Revisões

- Revisão periódica (trimestral ou proporcional) de desempenho e risco.
- Registro de evidências (atas, tickets, relatórios) e ações corretivas.

### 9.3 Gestão de mudanças

- Mudanças do fornecedor (termos, fluxo, local de dados, subprocessing) devem ser avaliadas.
- Mudanças críticas devem acionar change management e atualizar políticas/procedimentos.

## 10. Contingência e exit plan

### 10.1 Estratégia

Para fornecedores críticos:

- Definir estratégia de substituição (alternativa técnica e contratual).
- Definir prazo máximo aceitável de indisponibilidade e degradação.

### 10.2 Testes

- Testar cenários de falha e saída quando viável.
- Registrar resultados e melhorias.

## 11. Governance

### 11.1 Papéis

- Owner do fornecedor: responsável por relacionamento e performance.
- Segurança: requisitos técnicos e evidências.
- Compliance/MLRO: requisitos regulatórios e evidência AML.
- Direção/Board: aprova riscos e exceções.

### 11.2 Evidências

Toda decisão relevante deve ter evidência: aprovação, racional, riscos residuais e plano.

## 12. Limitações e próximos passos

1) Outsourcing register: formalizar modelo padrão de registro e rotina de atualização.

2) Pacote contratual: padronizar anexos (SLA, incident notification, DPA e exit).

3) Testes de exit: calendarizar ao menos um teste anual para fornecedores críticos, conforme maturidade.
