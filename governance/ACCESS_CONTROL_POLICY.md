# GSS — Access Control Policy (Internal)

Versão: 0.1

Data de criação: 2026-03-12

Data de última revisão: 2026-03-12

Responsável: (preencher)

## Objetivo

Definir como o acesso a sistemas e dados da GSS deve ser concedido, revisado e revogado, com regras operacionais claras, alinhadas com o RBAC e os controles existentes no código.

## Escopo

- Acesso a: GitHub, Vercel, banco de dados (PostgreSQL), Stripe, Supabase, Slack/alertas, logs e quaisquer credenciais externas.
- Acesso lógico dentro do produto (roles do usuário e rotas administrativas).

## Regras operacionais concretas

### Princípios

- Proibido uso de contas compartilhadas (GitHub/Vercel/Stripe/Supabase/DB).
- Todo acesso deve ser nominal (pessoa identificável) e registrado no inventário de acessos.
- Privilégio mínimo: conceder apenas o nível necessário (read/write/admin) e apenas aos sistemas necessários.
- Acesso administrativo deve ter 2FA habilitado no provedor (GitHub/Vercel/Stripe/Supabase) e senha gerenciada.

### Concessão de acesso

- Todo novo acesso exige:
  - justificativa (ticket/nota operacional)
  - data de concessão
  - aprovador (fundador/responsável)
  - prazo (quando aplicável)
- Acesso a produção deve ser concedido separadamente de ambientes de teste/preview.

### Revisão periódica

- Revisão mínima: mensal.
- Na revisão, remover acessos não utilizados, papéis excessivos e chaves antigas.
- Registrar data da revisão e resultado (mantido/rebaixado/removido).

### Revogação/offboarding

- Ao desligamento ou troca de função, revogar acessos em até 24h.
- Rotacionar segredos compartilhados por sistemas (ex.: `CRON_SECRET`, secrets de webhook) se houve exposição.

### Acesso lógico no produto (RBAC)

- Usuários possuem role no banco de dados.
- Endpoints administrativos/sensíveis devem checar role explicitamente.
- É proibido usar “admin por e-mail” como regra de autorização.

## Inventário de acessos

- Template: `governance/ACCESS_INVENTORY_TEMPLATE.md`
- O preenchimento do inventário é manual e deve ser mantido pelo fundador/responsável.

## Controles técnicos relacionados

- Enum e campo de role: `prisma/schema.prisma` (`UserRole`, `User.role`)
- Helpers de RBAC para rotas: `src/lib/rbac.ts`
- Sessão e role em JWT/DB: `src/lib/session.ts` e `src/lib/auth.ts`
- Endpoints administrativos (exemplos):
  - `src/app/api/admin/users/route.ts`
  - `src/app/api/admin/kyc/approve/route.ts`
  - `src/app/api/admin/logs/route.ts`

## Roadmap / futuro (não implementado como realidade atual)

- Implementar aprovação dupla (4-eyes) para ações críticas (ex.: decisões AML CRITICAL, mudanças de config AML).
- Implementar logs de acesso administrativo no nível do provedor (ex.: export periódico de audit logs do Stripe/Vercel/GitHub).

