# Política de KYC e Onboarding — GlobalSecureSend (GSS)

## 1. Controle do documento

Documento: Política de KYC e Onboarding (Pessoa Física) — GSS

- Proprietário (Owner): Compliance/MLRO (Interim)
- Co-proprietário (Co-Owner): Security Owner (Interim)
- Aprovador: Direção/Board (Fase A)
- Data de vigência: 01/03/2026
- Versão: 1.0
- Classificação: Interno

### Histórico de revisões

| Data | Versão | Mudança principal | Responsável |
|---|---:|---|---|
| 01/03/2026 | 1.0 | Emissão inicial (data room ready) | Compliance/MLRO (Interim) |

## 2. Objetivo

Estabelecer uma política única e auditável de KYC e onboarding para a GlobalSecureSend (GSS), assegurando:

- Cumprimento de obrigações aplicáveis de AML/CFT no contexto de Luxemburgo e UE (proporcional à fase do negócio).
- Aplicação consistente do risk-based approach (RBA) na aceitação, recusa e monitorização de clientes.
- Rastreabilidade e evidência de decisões (inspeção-ready), incluindo retenção mínima AML.

## 3. Escopo

Esta política aplica-se a:

- Onboarding e KYC de pessoas físicas (PF) na Fase A.
- Preparação e requisitos de desenho para onboarding de pessoas jurídicas (PJ) e UBO, a serem habilitados em fases subsequentes.
- Fluxos realizados por terceiros (ex.: Stripe Identity) e as responsabilidades internas da GSS.

Fora de escopo (nesta versão):

- Custódia cripto e controles específicos de CASP MiCA (tratados em roadmap próprio).
- Processo completo de STR/SAR operacionalizado com FIU/LHoFT (incluído como requisito a implementar; ver Limitações e próximos passos).

## 4. Base legal e referências (alto nível)

Esta política é alinhada, em nível de princípios e objetivos, com:

- Diretivas AML da UE (AMLD) e o princípio de abordagem baseada em risco.
- Lei AML de Luxemburgo (Lei de 12/11/2004, conforme alterações) e expectativas de governança e evidência.
- Boas práticas de supervisão e accountability aplicáveis (CSSF/LHoFT) para atividades relevantes.

Esta política não substitui aconselhamento jurídico. Em caso de conflito entre esta política e obrigações legais/contratuais, prevalece a obrigação aplicável.

## 5. Definições

- CDD: Customer Due Diligence (diligência padrão).
- SDD: Simplified Due Diligence (diligência simplificada, quando admissível).
- EDD: Enhanced Due Diligence (diligência reforçada).
- PEP: Politically Exposed Person.
- Sanções: restrições impostas por regimes de sanções aplicáveis (UE/ONU e outros aplicáveis por contrato/parceiros).
- UBO: Ultimate Beneficial Owner (beneficiário efetivo).
- Relação de negócio: relação contínua com o cliente; distinta de transação ocasional.

## 6. Princípios

1) Nenhuma relação de negócio deve ser iniciada sem CDD apropriado.

2) Proporcionalidade: requisitos e controles variam por risco (RBA) e por fase (A/B/C).

3) Evidência e rastreabilidade: toda decisão relevante (aceitar, recusar, suspender, encerrar, exceção) deve ter justificativa, data/hora, responsável e registro.

4) Segregação de funções: decisões de exceção e decisões de risco alto devem ter aprovação reforçada (ver Governance).

5) Responsabilidade por terceiros: o uso de terceiro não transfere a responsabilidade de governança e controle para fins de inspeção.

## 7. Modelo de risco de cliente (Customer Risk Assessment)

### 7.1 Níveis de risco

A GSS classifica clientes em, no mínimo, três níveis:

- Baixo (Low)
- Médio (Medium)
- Alto (High)

### 7.2 Fatores mínimos de risco

A avaliação deve considerar, no mínimo:

- País de residência/nacionalidade e exposição geográfica (inclui países sancionados e de alto risco).
- Produto e canal (ex.: onboarding remoto; dependência de terceiros; tipo de operação disponível).
- Perfil e comportamento operacional (padrões, frequência, volume, sinais de abuso/fraude).
- PEP e sanções (quando aplicável, conforme disponibilidade de screening).
- Sinais de fraude, inconsistência de dados, documentos inválidos, tentativas repetidas ou padrões de risco.

### 7.3 Triggers de reclassificação

Um cliente deve ser reclassificado quando houver:

- Mudança de país (residência, origem/destino recorrente).
- Aumento de volume ou frequência material.
- Indicadores de fraude/abuso.
- Resultado de screening (PEP/sanções) ou eventos de compliance.

## 8. Requisitos de CDD por nível de risco

### 8.1 Risco Baixo/Médio (CDD padrão)

Para risco baixo/médio, exige-se:

- Identificação e verificação da identidade por meio de fluxo de KYC suportado (terceiro ou processo interno aprovado).
- Coleta de dados essenciais do cliente para fins de contato e diligência (minimização aplicada).
- Resultado de verificação registrado e auditável.

### 8.2 Risco Alto (EDD)

Para risco alto, exige-se diligência reforçada, que pode incluir:

- Documentação adicional e validações complementares.
- Avaliação adicional de consistência dos dados e do risco de fraude.
- Quando aplicável ao produto/fase: origem de fundos e/ou origem de riqueza.
- Aprovação reforçada por Compliance/MLRO antes de liberar funcionalidades de risco.

### 8.3 Casos proibidos e restritos

- Países proibidos: incluem países sancionados e países explicitamente definidos como bloqueados pela política da GSS.
- Países restritos: países de alto risco ou que exijam EDD. Devem ter controles adicionais e aprovação conforme governança.

## 9. Processo de onboarding (Pessoa Física)

### 9.1 Etapas

1) Início do onboarding: apresentação do fluxo e coleta mínima de dados.

2) Verificação de identidade (KYC): execução via processo aprovado (ex.: Stripe Identity na Fase A).

3) Decisão:

- Aprovado: habilitação conforme nível de risco e regras de produto.
- Pendente/Em revisão: restrição de funcionalidades até conclusão.
- Recusado: encerramento do onboarding, com registro do motivo.

4) Registro e evidência:

- Registro do status, data/hora, e trilha de eventos relevantes.
- Registro de exceções (se houver).

### 9.2 Falha segura

Sempre que a verificação falhar, estiver pendente por tempo além do previsto, ou houver inconsistência material, aplica-se:

- Restrição de acesso a funcionalidades sensíveis até resolução.
- Gatilho de revisão interna quando houver padrões recorrentes (operacional, fornecedor, fraude).

### 9.3 Decisão e accountability

Toda decisão deve registrar:

- Resultado (aprovar/recusar/suspender/encerrar)
- Motivo e evidências utilizadas
- Responsável e aprovador (quando aplicável)
- Data/hora

## 10. Uso de terceiro (Stripe Identity) — responsabilidades e limites

### 10.1 Finalidade

Na Fase A, a GSS utiliza um fornecedor para executar parte da verificação de identidade (KYC), visando eficiência operacional e padronização.

### 10.2 Limites e responsabilidades

- O fornecedor executa a verificação; a GSS mantém governança, regras de aceitação e retenção de evidências.
- A GSS define países suportados/restritos e as regras de exceção.
- A GSS mantém procedimento para tratar indisponibilidade, inconsistência e falhas do fornecedor.

### 10.3 Falhas, exceções e indisponibilidade

Quando houver indisponibilidade ou falha repetida:

- Registrar incidente operacional/compliance conforme procedimento de incident response.
- Aplicar degradação segura (não liberar funcionalidade sensível sem verificação).
- Avaliar reprocessamento/re-submissão e comunicação ao usuário conforme templates.

### 10.4 Gestão de mudanças do fornecedor

Mudanças relevantes do fornecedor (fluxo, termos, local de dados, subcontratação, SLAs) devem:

- Ser avaliadas em gestão de terceiros.
- Ser registradas em change management.
- Atualizar esta política e procedimentos associados, quando necessário.

## 11. Países suportados, restritos e proibidos

### 11.1 Critérios

A lista de países deve refletir:

- Capacidade operacional de diligência.
- Apetite de risco e requisitos de compliance.
- Restrições legais e contratuais aplicáveis.

### 11.2 Gestão da lista

- A lista de países suportados/restritos/proibidos é mantida por Compliance/MLRO com input de Produto e Segurança.
- Alterações exigem registro, justificativa, aprovação e comunicação interna.

## 12. PEP e sanções

### 12.1 Regra geral

A GSS deve aplicar screening de sanções/PEP no onboarding e de forma contínua quando operacionalmente habilitado.

### 12.2 Frequência

- No onboarding: screening antes da decisão final.
- Contínuo: revisão periódica e/ou por gatilho (mudança de dados, padrões de risco, alertas).

### 12.3 Resolução de hits

1) Identificar hit e classificar (potencial/falso positivo).

2) Investigar com evidências suficientes.

3) Decidir:

- Se sanção aplicável: recusar/encerrar e manter evidência.
- Se PEP: aplicar EDD e aprovações reforçadas.
- Se falso positivo: documentar racional.

4) Registrar evidência e trilha de decisão.

## 13. Pessoa jurídica e UBO (quando habilitar)

Mesmo que o onboarding PJ não esteja habilitado na Fase A, esta política define pré-requisitos mínimos para habilitação:

- Coleta e validação de documentos corporativos.
- Identificação e verificação de administradores/representantes.
- Identificação e verificação de UBOs, incluindo estruturas indiretas.
- Critérios de aceitação e EDD para estruturas complexas.

Habilitar PJ exige procedimento operacional específico, matriz de risco PJ e treinamento de equipes.

## 14. Refresh e monitorização contínua de KYC

### 14.1 Periodicidade

O refresh deve ser proporcional ao risco:

- Risco baixo: revisão periódica em ciclo mais longo.
- Risco médio: revisão periódica em ciclo intermediário.
- Risco alto: revisão periódica curta e revisão por eventos.

### 14.2 Gatilhos (event-driven)

Devem disparar refresh:

- Mudança de país ou dados críticos.
- Aumento de volume/frequência.
- Alertas de fraude/abuso.
- Hits de sanções/PEP.

### 14.3 Evidência

Cada refresh deve deixar evidência de:

- O que foi revisado.
- Resultado e decisões.
- Aprovações e exceções.

## 15. Retenção e privacidade

### 15.1 Retenção AML mínima

A GSS retém evidências AML/KYC por pelo menos 5 anos após o fim da relação de negócio ou a última transação relevante, conforme aplicável.

### 15.2 Minimização e acesso

- Coletar apenas dados necessários para fins de KYC/AML e operação.
- Restringir acesso por necessidade de saber e perfis autorizados.

### 15.3 Direitos do titular e limitações

Atender solicitações de titulares (GDPR/LGPD) respeitando limitações legais de AML, registrando justificativas quando a resposta for limitada por obrigação legal.

### 15.4 Legal hold

Quando houver investigação, incidente, disputa ou obrigação legal, suspender rotinas de descarte para dados relevantes, mantendo cadeia de custódia e evidência.

## 16. Governance e responsabilidades (RACI)

### 16.1 Papéis

- Direção/Board (conforme fase): aprova apetite de risco e políticas.
- Compliance/MLRO (proporcional à fase): define requisitos AML/KYC, aprova exceções e EDD, responde a inspeções.
- Operações (Onboarding): executa processos, mantém evidência, escala casos.
- Segurança/Engenharia: implementa controles técnicos e trilhas de auditoria.
- Suporte: interage com clientes conforme scripts aprovados.

### 16.2 Aprovações

- Exceções e casos de alto risco exigem aprovação reforçada (Compliance/MLRO) e registro.

### 16.3 Métricas

Métricas mínimas de controlo:

- Taxa de falhas de verificação.
- Tempo médio de verificação.
- Backlog de pendências.
- Taxa de exceções e motivos.

## 17. Evidências e anexos

Esta política deve ser mantida com um dossiê de evidências anexáveis, incluindo:

- Relatórios de testes e mapa de evidências.
- Relatório de identidade (KYC/2FA/OTP) e relatórios correlatos.

### Evidências técnicas atuais

- `docs/TEST_REPORT.md` (índice de testes e evidências por área)
- `docs/SECURITY_TEST_REPORT.md` (segurança: sessão/auth, OTP/2FA, controles)
- `docs/KYC_STRIPE_2FA_REPORT.md` (fluxo KYC + 2FA/OTP e evidências)
- “GlobalSecureSend — Test Report (Validação Pré-Deploy)” (relatório pré-deploy)
- “Relatório Detalhado de Testes (Mapa de evidências)” (rastreabilidade de evidências)

## 18. Limitações e próximos passos

1) Screening de sanções/PEP e STR/SAR: esta política define requisitos, mas a operacionalização completa (ferramenta, fontes, workflow formal com FIU/LHoFT e templates) deve ser finalizada.

2) Matriz formal de risco (pontuação): deve ser detalhada e validada pelo Compliance/MLRO, incluindo thresholds e critérios por produto.

3) Onboarding PJ/UBO: requer política complementar operacional e habilitação técnica/processual.

4) Retenção e cadeia de custódia: a matriz de retenção detalhada e controles de imutabilidade devem ser especificados junto à Política de Logs/Auditoria/Retenção.
