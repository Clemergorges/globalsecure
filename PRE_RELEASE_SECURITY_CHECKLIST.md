# Checklist de Segurança Pré-Release (Go-Live)

Este checklist deve ser validado por um Engenheiro de Segurança ou Tech Lead antes de cada deploy em produção.

**Data:** ____/____/______
**Versão:** ______
**Responsável:** ________________________

---

## 1. Segurança de Aplicação (AppSec)
- [ ] **Segredos:** Nenhuma chave de API, token ou credencial hardcoded no código. `.env` validado.
- [ ] **Dependências:** `npm audit` executado. Nenhuma vulnerabilidade crítica/alta pendente.
- [ ] **Injeção:** Todas as queries de banco usam parâmetros (Prisma/ORM).
- [ ] **XSS:** Inputs de usuário sanitizados. Headers CSP configurados.
- [ ] **Autenticação:** JWT Secret rotacionado. Expiração de token configurada corretamente.
- [ ] **2FA:** Obrigatório para ações administrativas e financeiras críticas.

## 2. Infraestrutura & Rede
- [ ] **HTTPS:** SSL/TLS forçado em todas as rotas (HSTS ativado).
- [ ] **Database:** Acesso público desativado. Conexão apenas via VPC/VPN ou IP Allowlist.
- [ ] **Firewall:** WAF (Cloudflare/AWS) ativo com regras de rate limiting.
- [ ] **Backups:** Backup automatizado configurado e testado (Restore validado).
- [ ] **Logs:** Logs de acesso e erro centralizados (não expostos ao público).

## 3. Conformidade Financeira (Fintech Core)
- [ ] **Atomicidade:** Teste de transação concorrente passou.
- [ ] **Limites:** Limites de KYC (Diário/Mensal) ativos e testados.
- [ ] **KYC:** Fluxo de verificação de identidade bloqueia usuários não verificados.
- [ ] **AML:** Lista de sanções (Sanctions Screening) integrada (se aplicável).
- [ ] **Ledger:** Imutabilidade do histórico de transações garantida.

## 4. Privacidade & Dados (GDPR)
- [ ] **Consentimento:** Checkbox de Termos e Privacidade obrigatório no cadastro.
- [ ] **Minimização:** Apenas dados necessários coletados.
- [ ] **Criptografia:** Senhas (bcrypt) e PII sensível (AES) criptografados.
- [ ] **Cookies:** Banner de cookies implementado e bloqueando scripts antes do aceite.

## 5. Plano de Resposta a Incidentes
- [ ] **Monitoramento:** Alertas de erro (Sentry/Datadog) configurados.
- [ ] **Contatos:** Lista de contatos de emergência (DevOps, Legal, PR) atualizada.
- [ ] **Rollback:** Script ou procedimento de rollback de deploy validado.
- [ ] **Playbook:** Playbook de vazamento de dados disponível.

---

**Status Final:**
[ ] APROVADO PARA DEPLOY
[ ] REPROVADO (Listar bloqueadores abaixo)

**Bloqueadores:**
1. __________________________________________________________________
2. __________________________________________________________________
