# Security Policy - GlobalSecureSend (GSS)

## Supported Versions

| Version | Supported |
|---------|----------|
| main (prod) | :white_check_mark: |
| feature/* branches | :x: |

## Reporting a Vulnerability

Por favor, **NAO abra issues publicas** para vulnerabilidades de seguranca.

### Como reportar

Envie um email para: **security@globalsecuresend.com**

Inclua:
- Descricao detalhada da vulnerabilidade
- Passos para reproduzir
- Impacto potencial
- Sugestao de correcao (se houver)

**Prazo de resposta:** Respondemos em ate 48 horas.

## Security Standards

Este projeto segue:

- **OWASP Top 10** para seguranca de aplicacoes web
- **PCI DSS** para processamento de dados de pagamento (via Stripe)
- **GDPR / RGPD** para protecao de dados pessoais
- **MiCA** (Markets in Crypto-Assets Regulation) para conformidade com criptoativos
- **CSSF** requirements (Luxembourg financial regulator)

## Security Controls Implemented

### Autenticacao e Autorizacao
- JWT com expiracao configurada
- OTP/SCA para transferencias de alto valor
- KYC obrigatorio via Stripe Identity
- Rate limiting em todas as rotas criticas
- 2FA habilitado para usuarios

### Protecao de Dados
- Todo trafego via HTTPS (forcado pelo Vercel)
- Dados em repouso criptografados (Supabase/PostgreSQL)
- Campos sensiveis com criptografia adicional
- Logs sem dados sensiveis completos (apenas IDs, ultimos digitos)
- Nunca logar OTP completo, numero de documento completo ou chaves

### Pipeline de Seguranca CI/CD
- CodeQL scanning em todo PR para main
- Dependabot para atualizacoes semanais de dependencias
- Secret scanning ativado no repositorio
- Migrations em producao apenas via pipeline CI/CD (prisma migrate deploy)
- Branch protection em `main` (PR obrigatorio + 1 approval)
- Smoke tests automaticos apos cada deploy

### Fluxo Financeiro (Fail-Safe)
- OTP/SCA obrigatorio para transferencias acima do threshold
- Fila AML com revisao manual para casos suspeitos
- **Falha tecnica = operacao negada** (nunca fail-open)
- Nunca liberar dinheiro se OTP/SCA falhar por bug
- Auditoria de todas as operacoes financeiras

### Gestao de Segredos
- Todas as chaves em GitHub Secrets ou Vercel Environment Variables
- Nunca versionar .env, chaves ou configs sensiveis
- Chaves separadas por ambiente (dev/staging/prod)
- Chaves de teste nunca reutilizadas em producao

## Responsible Disclosure

Apreciamos reportes responsaveis e podemos oferecer reconhecimento publico
(com sua permissao) ao pesquisador apos a correcao ser aplicada.

## Contact

- Security: security@globalsecuresend.com
- General: contact@globalsecuresend.com
- Regulatory: compliance@globalsecuresend.com
