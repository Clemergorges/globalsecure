# Política de SDLC, Change Management e Release Pack — GlobalSecureSend (GSS)

## 1. Controle do documento

Documento: Política de SDLC, Change Management e Release Pack — GSS

- Proprietário (Owner): Engineering Lead (Interim)
- Co-proprietário (Co-Owner): Security Owner (Interim)
- Co-proprietário (Co-Owner): Compliance/MLRO (Interim)
- Aprovador: Direção/Board (Fase A)
- Data de vigência: 01/03/2026
- Versão: 1.0
- Classificação: Interno

### Histórico de revisões

| Data | Versão | Mudança principal | Responsável |
|---|---:|---|---|
| 01/03/2026 | 1.0 | Emissão inicial (data room ready) | Engineering Lead (Interim) |

## 2. Objetivo

Definir um padrão mínimo e auditável de:

- Ciclo de vida de desenvolvimento (SDLC).
- Gestão de mudanças (change management).
- Evidências por release (“release pack”).
- Segregação de ambientes.
- Gestão de vulnerabilidades e dependências.

## 3. Escopo

Aplica-se a:

- Código da aplicação.
- Infraestrutura, configuração e variáveis críticas.
- Mudanças em integrações e fornecedores críticos.
- Mudanças em regras que afetam AML/KYC, segurança e controles operacionais.

## 4. Princípios

1) Mudança com evidência: testes, revisão e registro.

2) Segregação: dev/test/staging/prod e segregação de funções.

3) Segurança por padrão: gestão de segredos, hardening e minimização de acesso.

4) Rastreabilidade: toda mudança relevante deve ser vinculada a justificativa e responsável.

## 5. Requisitos mínimos por mudança

Cada mudança deve ter:

- Descrição do objetivo e do impacto.
- Classificação de risco (baixo/médio/alto) e impacto regulatório quando aplicável.
- Evidência de revisão (peer review) e aprovação conforme criticidade.
- Evidência de testes automatizados e build.
- Plano de rollback.

Mudanças com impacto em AML/KYC, autenticação, logs e terceiros exigem avaliação explícita de Compliance/MLRO e Security Owner.

## 6. Processo de desenvolvimento (SDLC) — mínimo

### 6.1 Desenvolvimento

- Trabalhar com branches e revisão por pares.
- Evitar hardcoding de segredos e dados pessoais.

### 6.2 Testes e validação

- Executar suites relevantes e manter relatórios (test reports) como evidência.
- Garantir que mudanças críticas tenham testes associados.

### 6.3 Aprovação

- Mudanças de risco alto exigem aprovação de Engineering Lead e Security Owner.
- Mudanças regulatórias exigem aprovação de Compliance/MLRO.

## 7. Segregação de ambientes

- Dev/test e produção devem ser segregados.
- Dados de produção não devem ser usados em dev/test, salvo com anonimização e aprovação.
- Variáveis e segredos de produção devem ser gerenciados em mecanismo adequado, com acesso restrito.

## 8. Release Pack (evidência por versão)

Cada release deve gerar um pacote mínimo com:

- Identificação da versão e data.
- Changelog objetivo.
- Lista de mudanças relevantes (inclui regras AML/KYC, auth, logs, integrações).
- Evidência de testes e build (links ou anexos internos).
- Avaliação de risco e riscos residuais.
- Aprovações (Engineering, Security, Compliance quando aplicável).
- Plano de rollback e critérios de go/no-go.

### 8.1 Critérios de go/no-go (baseline)

Um release só pode ir para produção quando, no mínimo:

- `npm run test:all` PASS (unit/integration/e2e/failure).
- `npm run build` PASS.
- Não existirem findings críticos de vulnerabilidades em aberto para componentes expostos à produção.
- Não existirem regressões conhecidas em fluxos críticos (auth/sessão, KYC, AML/risk-gates, logs/auditoria).
- O release pack estiver completo e aprovado (Engineering + Security Owner; Compliance/MLRO quando aplicável).

TODO: definir ferramenta/processo padrão de vulnerabilidades (ex.: SCA em CI, Dependabot + triagem, ou scanner dedicado).

### 8.2 Exigência de release pack por versão

Para cada versão publicada, deve existir um release pack arquivado com:

- O que mudou (changelog objetivo e escopo).
- Evidências de teste e build (logs/relatórios internos).
- Riscos identificados e riscos residuais aceitos.
- Aprovações (Engineering, Security Owner e, quando aplicável, Compliance/MLRO).

## 9. Mudanças emergenciais

Mudanças emergenciais são permitidas quando necessárias para contenção de incidente, com:

- Registro do racional e escopo.
- Aprovação mínima (Engineering + Security, e Compliance quando aplicável).
- Evidência posterior (“post-change review”) em até 48–72h.

## 10. Gestão de vulnerabilidades e dependências

- Manter rotina de atualização de dependências críticas.
- Avaliar vulnerabilidades com base em criticidade e exposição.
- Definir prazos de correção proporcionais ao risco (ex.: crítico/alto com prioridade).
- Registrar decisões de aceitação temporária de risco (risk acceptance) com prazo.

## 11. Gestão de segredos e configuração

- Segredos de produção devem ser obrigatórios e não podem ter valores fracos ou default.
- Rotação de segredos deve ocorrer após incidentes e periodicamente conforme criticidade.
- Inventário de variáveis críticas deve ser mantido (KYC/AML/monitorização/rate limits).

## 12. Evidências e auditoria

- Manter evidências de revisões, testes e aprovações.
- Garantir rastreabilidade entre mudança e release pack.

## 13. Limitações e próximos passos

1) Formalização do processo: estabelecer templates para change request e release pack.

2) Gestão de vulnerabilidades: definir ferramenta/processo contínuo e KPIs.

3) Segregação de funções: documentar claramente papéis e autorizações no processo de deploy.
