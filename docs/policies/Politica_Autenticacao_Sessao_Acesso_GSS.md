# Política de Autenticação, Sessão e Gestão de Acesso — GlobalSecureSend (GSS)

## 1. Controle do documento

Documento: Política de Autenticação, Sessão e Gestão de Acesso — GSS

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

Definir regras mínimas e auditáveis para:

- Autenticação de usuários e administradores.
- Gestão de sessão e reautenticação para ações sensíveis.
- Gestão de acessos (least privilege, segregação de funções, revisão periódica).
- Controles anti-abuso e resposta a tentativas de takeover (ATO).

## 3. Escopo

Aplica-se a:

- Usuários finais.
- Perfis administrativos e funções operacionais (Admin, Compliance, Tesouraria).
- Acessos de fornecedores e suporte (quando existirem).

## 4. Princípios

1) Least privilege e need-to-know.

2) Segregação de funções (SoD) para operações sensíveis.

3) Autenticação reforçada por risco (step-up) para ações críticas.

4) Evidência e auditabilidade: eventos críticos devem ser registrados.

5) Segurança por padrão: configurações seguras e revogação rápida quando necessário.

## 5. Requisitos de credenciais

### 5.1 Senhas (usuários)

- A senha deve ser robusta e resistir a ataques de força bruta e reuse.
- Recomenda-se como baseline: mínimo de 12 caracteres e bloqueio de senhas comuns/comprometidas.
- Reuse: o sistema deve impedir a reutilização imediata de senhas recentes.
- Reset: resets devem exigir verificação reforçada e deixar evidência.

### 5.2 Senhas (administradores)

- Administradores devem usar senha forte e MFA obrigatório.
- É proibido compartilhamento de credenciais administrativas.

### 5.3 Gestão de segredos

- Segredos (tokens, chaves, credenciais) devem ser armazenados em mecanismos apropriados e nunca em texto claro em locais não autorizados.
- Acesso a segredos deve ser restrito, rastreável e revisado.

## 6. MFA/2FA

### 6.1 Quando MFA é obrigatório

MFA deve ser obrigatório, no mínimo, para:

- Perfis administrativos.
- Ações sensíveis (ex.: troca de senha, alteração de dados críticos, operações de alto impacto).
- Situações de risco elevado (fraude suspeita, anomalias de sessão).

### 6.2 Canal SMS e riscos

Quando MFA/2FA utiliza SMS:

- Reconhece-se risco de SIM swap e comprometimento do canal.
- Devem existir controles compensatórios: rate limiting, monitorização, e step-up adicional quando houver sinais de abuso.

### 6.3 Troca de número de telefone

- Trocas de número devem exigir verificação reforçada, registro de decisão e janela de segurança quando aplicável.
- O processo deve ser documentado e auditável.

### 6.4 Exceções

Exceções a MFA:

- Devem ser raras, justificadas, aprovadas por Security Owner e Compliance (quando aplicável), com prazo de validade.
- Devem ser registradas e revisadas.

## 7. Gestão de sessão

### 7.1 Regras de expiração e renovação

- Sessões devem expirar de forma consistente com o risco do perfil.
- Perfis administrativos devem ter expiração mais curta.
- Renovação de sessão deve ser controlada; para ações críticas exige-se step-up.

### 7.2 Revogação e logout global

- A GSS deve ser capaz de revogar sessões individualmente e, quando necessário, efetuar logout global.
- Suspeita de comprometimento exige revogação imediata e registro do evento.

### 7.3 Reautenticação (step-up)

Ações sensíveis exigem reautenticação/step-up, incluindo:

- Troca de senha.
- Alteração de fatores de autenticação.
- Operações administrativas e decisões de compliance.

### 7.4 Detecção de anomalias

Devem existir sinais de anomalia de sessão para acionar controles adicionais, por exemplo:

- Mudança significativa de dispositivo/IP.
- Padrões de falha repetida.
- Comportamento de automação.

## 8. Proteções anti-abuso

### 8.1 Rate limiting e throttling

- Endpoints expostos devem ter limites por IP e/ou por conta, com registro de eventos relevantes.
- Limites e janelas devem ser revisados periodicamente conforme risco.

### 8.2 Lockout e proteção contra credential stuffing

- Deve haver mecanismo de bloqueio temporário e/ou step-up após tentativas repetidas.
- Deve haver monitorização de padrões de tentativas e alertas para picos anômalos.

### 8.3 Alertas e resposta

- Eventos de abuso (ex.: exceder limites) devem gerar alerta operacional.
- Deve existir runbook de resposta para ATO.

## 9. Recuperação de conta

### 9.1 Princípios

- Evitar mecanismos de baixa segurança (ex.: KBA fraco).
- Exigir verificação reforçada e evidência de decisão.

### 9.2 Fluxo mínimo

- Iniciar recuperação com fator controlado (ex.: email verificado) e step-up.
- Aplicar controles anti-abuso.
- Registrar evento e resultado.

## 10. Acessos administrativos e segregação

### 10.1 Joiner / mover / leaver

- Criação, mudança e remoção de acessos devem seguir processo formal.
- Deve existir aprovação do responsável e registro auditável.

### 10.2 Revisão periódica

- Acessos administrativos devem ser revisados periodicamente.
- Deve haver evidência (relatório, ata ou ticket) das revisões e remediações.

### 10.3 Break-glass

- Acesso emergencial (“break-glass”) deve ser excepcional, com logging reforçado.
- Exige revisão posterior obrigatória e registro do racional.

## 11. Monitorização e auditoria

Eventos mínimos a registrar:

- Login/logout e falhas.
- Lockouts e limites acionados.
- Mudanças de credenciais e fatores MFA.
- Emissão/consumo de OTP para ações sensíveis.
- Ações administrativas e acessos privilegiados.

## 12. Treinamento e conformidade

- Equipes com acesso privilegiado devem receber treinamento mínimo anual em segurança e compliance.
- Violações desta política podem resultar em medidas disciplinares e ações corretivas.

## 13. Limitações e próximos passos

1) Parâmetros operacionais (lockout, thresholds e detecção avançada): devem ser formalizados e alinhados aos controles técnicos e ao apetite de risco.

2) Revisão periódica de acessos: deve ser calendarizada com evidência recorrente.

3) Mecanismos adicionais (ex.: detecção de “impossible travel”, gestão de dispositivos): podem ser adicionados conforme evolução do programa de monitorização.

## 14. Evidências técnicas atuais

- `docs/TEST_REPORT.md` (índice de testes e evidências por área)
- `docs/SECURITY_TEST_REPORT.md` (segurança: sessão/auth, OTP/2FA, controles)
- `docs/KYC_STRIPE_2FA_REPORT.md` (fluxo KYC + 2FA/OTP e evidências)
- “GlobalSecureSend — Test Report (Validação Pré-Deploy)” (relatório pré-deploy)
- “Relatório Detalhado de Testes (Mapa de evidências)” (rastreabilidade de evidências)
