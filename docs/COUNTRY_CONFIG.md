# Configuração de País e Moeda - GlobalSecureSend

## Visão Geral
O sistema implementa uma lógica automática de configuração baseada no país de residência do cliente. Isso garante conformidade regulatória e melhor experiência do usuário (UX), oferecendo os métodos de pagamento locais corretos.

## Regras de Negócio

### 1. Determinação de Moeda
A moeda base da carteira (`primaryCurrency`) é determinada automaticamente no momento do cadastro com base no país selecionado.

| Região/País | Moeda |
|-------------|-------|
| Zona do Euro (LU, DE, FR, ES, IT, PT, NL, BE, AT, IE, FI) | **EUR** (€) |
| Brasil (BR) | **BRL** (R$) |
| Reino Unido (GB) | **GBP** (£) |
| Estados Unidos (US) | **USD** ($) |
| Outros (Default) | **USD** ($) |

### 2. Métodos de Pagamento Disponíveis
Os métodos de depósito exibidos no dashboard dependem do país e moeda do usuário.

#### **SEPA Instant (Euro)**
*   **Disponibilidade:** Apenas para usuários da Zona do Euro ou com moeda base EUR.
*   **Detalhes:** Exibe IBAN de Luxemburgo para transferências instantâneas.

#### **PIX (Brasil)**
*   **Disponibilidade:** Apenas para usuários com país `BR`.
*   **Detalhes:** Gera QR Code dinâmico para pagamento instantâneo em BRL.

#### **Crypto (USDT/USDC)**
*   **Disponibilidade:** Global (Todos os usuários).
*   **Detalhes:** Depósitos via Blockchain (Polygon/Ethereum).

#### **SWIFT (Internacional)**
*   **Disponibilidade:** Global.
*   **Detalhes:** Transferência bancária internacional para usuários fora da zona SEPA/PIX.

## Implementação Técnica

### Backend
*   **Utilitário:** `src/lib/country-config.ts` contém o mapa de regras.
*   **Registro:** `src/app/api/auth/register/route.ts` usa o utilitário para definir `primaryCurrency`.
*   **Admin:** `src/app/admin/users/page.tsx` permite visualizar e gerenciar configurações.

### Frontend
*   **Cadastro:** Seletor de país obrigatório; moeda oculta (automática).
*   **Depósito:** `src/app/dashboard/wallet/deposit/page.tsx` usa `getUserProfile` (Server Action) para renderizar abas condicionalmente.

## Testes
A lógica foi validada via testes unitários em `tests/unit/country-config.test.ts`.

Para rodar os testes:
```bash
npm run test:unit
```