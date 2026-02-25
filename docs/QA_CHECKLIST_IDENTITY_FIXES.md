# QA Checklist — Identity Flow Fixes (P0/P1)

## Ambiente

- [ ] Local: `http://localhost:3002`
- [ ] Idiomas testados: `pt`, `en`, `es` (fallback), `fr`, `de`
- [ ] Navegadores: Chrome desktop, Chrome mobile (device emulador)

## KYC — Stripe Identity (BUG-001)

- [ ] Clicar em “Verificação Automática” mostra loader traduzido (pt/en)
- [ ] Falha 503/500 mostra mensagem `KYC.stripeConnectionError` e botão “Verificação Manual”
- [ ] Hint `KYC.cameraHttpsHint` aparece (desktop e mobile)
- [ ] `return_url` funciona com `NEXT_PUBLIC_APP_URL` e, sem ela, com `Origin`
- [ ] Auditoria criada em `audit_logs` para SUCCESS/FAILURE

## Segurança — Troca de senha com OTP (BUG-002)

- [ ] Submeter troca de senha dispara request OTP (`/api/auth/sensitive/otp/request`)
- [ ] Modal abre com input 6 dígitos e auto-focus
- [ ] Reenvio bloqueado por 60s; botão habilita ao terminar timer
- [ ] Erros OTP aparecem traduzidos: inválido/expirado/usado
- [ ] Após OTP válido, POST `/api/security/change-password` inclui `otpCode` e troca senha

## Sessões (BUG-003)

- [ ] Lista de sessões renderiza com badge “Sessão atual” em apenas 1 sessão
- [ ] Metadados aparecem: device, location, lastActive
- [ ] Encerrar sessão pede confirmação e remove sessão
- [ ] Encerrar todas as outras pede confirmação e encerra as demais

## Regressão i18n

- [ ] `npm run i18n:audit` passa (pt/en/fr/de)
- [ ] Troca de idioma não quebra páginas de KYC/Security

