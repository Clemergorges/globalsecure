# Referência de Tradução (i18n) — GlobalSecureSend

## Idiomas suportados
- `pt` (padrão)
- `en`
- `fr`
- `de`

## Como a app escolhe o idioma
- A app lê o cookie `NEXT_LOCALE`.
- Se o valor não estiver em `pt|en|fr|de`, usa `pt`.
- As mensagens vêm de `messages/<locale>.json` (com fallback para `messages/pt.json` se houver falha de import).

## Padrão de nomenclatura de chaves
- Namespaces de primeiro nível: `Dashboard`, `Cards`, `Settings`, `KYC`, `Admin`, `WalletDeposit`, `Register`.
- Namespaces adicionais padronizados: `Login`, `VerifyEmail`, `Transfers.Create`, `Transactions`, `SecureTransfer`, `Claim`, `Support`.
- Namespaces adicionais padronizados: `Onboarding`, `Analytics`, `ClaimClient`, `ClaimCreate`.
- Chaves devem ser:
  - descritivas e estáveis (ex.: `Dashboard.sendCard`)
  - sem termos genéricos visíveis ao usuário
  - alinhadas ao vocabulário corporativo (ex.: “Dashboard”, “Segurança da conta”, “Sessões ativas”).

## Termos principais (chaves e traduções)

### Dashboard
| Key | pt | en | fr | de |
|---|---|---|---|---|
| Dashboard.title | Visão Geral | Dashboard | Tableau de bord | Dashboard |
| Dashboard.welcome | Bem-vindo de volta | Welcome back | Bon retour | Willkommen zurück |
| Dashboard.deposit | Depositar | Deposit | Déposer | Einzahlen |
| Dashboard.transfer | Transferir | Transfer | Transférer | Überweisen |
| Dashboard.sendCard | Enviar Cartão | Send Card | Envoyer une carte | Karte senden |

### Cards
| Key | pt | en | fr | de |
|---|---|---|---|---|
| Cards.title | Meus Cartões | Cards | Mes cartes | Meine Karten |
| Cards.description | Gerencie seus cartões virtuais e visualize detalhes | Manage your virtual cards and view details. | Gérez vos cartes virtuelles et consultez les détails. | Verwalten Sie Ihre virtuellen Karten und sehen Sie Details ein. |
| Cards.noCardsFound | Nenhum cartão encontrado | No cards found | Aucune carte trouvée | Keine Karten gefunden |
| Cards.noActiveCards | Você ainda não possui cartões virtuais ativos. | You don't have any active virtual cards yet. | Vous n'avez pas encore de cartes virtuelles actives. | Sie haben noch keine aktiven virtuellen Karten. |

### Settings.Security
| Key | pt | en | fr | de |
|---|---|---|---|---|
| Settings.Security.changePassword | Alterar Senha | Change password | Changer le mot de passe | Passwort ändern |
| Settings.Security.updatePassword | Atualizar Senha | Update password | Mettre à jour | Passwort aktualisieren |
| Settings.Security.twoFactorAuth | Autenticação de Dois Fatores | Two-factor authentication | Authentification à deux facteurs | Zwei-Faktor-Authentifizierung |
| Settings.Security.activeSessions | Sessões Ativas | Active sessions | Sessions actives | Aktive Sitzungen |
| Settings.Security.verifySmsCodeTitle | Verificar Código SMS | Verify SMS code | Vérifier le code SMS | SMS-Code bestätigen |
| Settings.Security.confirm | Confirmar | Confirm | Confirmer | Bestätigen |

### KYC
| Key | pt | en | fr | de |
|---|---|---|---|---|
| KYC.identityVerification | Verificação de Identidade | Identity verification | Vérification d'identité | Identitätsprüfung |
| KYC.recommended | Recomendado | Recommended | Recommandé | Empfohlen |
| KYC.automaticVerification | Verificação Automática | Automatic verification | Vérification automatique | Automatische Verifizierung |
| KYC.manualVerification | Verificação Manual | Manual verification | Vérification manuelle | Manuelle Verifizierung |

## Validação (auditoria)
- Para garantir que nenhum idioma fique sem chaves necessárias:
  - `npm run i18n:audit`
  - O `pt.json` é usado como base; os outros idiomas devem conter as mesmas chaves.
