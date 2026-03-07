# GlobalSecureSend - Technical Whitepaper

**Version:** 2.0 (Technical Deep Dive)
**Date:** February 2026

## 1. Architectural Overview

GlobalSecureSend is built as a cloud-native, serverless financial platform. It leverages a hybrid architecture that orchestrates off-chain fiat ledgers with on-chain blockchain settlements.

### 1.1 Core Components
*   **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4.
*   **Backend:** Next.js API Routes (Serverless Functions) hosted on Vercel.
*   **Database:** PostgreSQL (NeonDB) with Prisma ORM.
*   **Blockchain:** Polygon Network (Amoy Testnet / Mainnet) via Alchemy RPC.
*   **Banking Infrastructure:** Stripe Connect & Stripe Issuing.
*   **Real-time Layer:** Pusher Channels for instant UI updates.

---

## 2. Financial Engine & Ledger

The core of GlobalSecureSend is its Double-Entry Ledger system, designed to ensure zero data discrepancies.

### 2.1 ACID Compliance
All financial operations utilize **Prisma Interactive Transactions** (`prisma.$transaction`). This ensures atomicity:
*   Example: An internal transfer involves debiting Sender and crediting Recipient.
*   **Guarantee:** Either both operations succeed, or neither does. No partial states.

### 2.2 Multi-Currency Support
The `Balance` model supports distinct columns for Fiat (`balanceEUR`, `balanceUSD`) and Crypto (`balanceUSDT`).
*   **Precision:** All fiat values are stored as `Decimal` types to avoid floating-point errors.
*   **Conversion:** Real-time rates are fetched via oracles/APIs during Swap operations.

### 2.3 Transaction Guards
A "Guard" middleware layer intercepts requests before execution:
*   **KYC Guard:** Verifies `kycLevel` (0, 1, 2) against transaction limits.
*   **Balance Guard:** Ensures `availableBalance >= amount + fees`.
*   **Risk Guard:** (Planned) Checks for velocity patterns (e.g., rapid consecutive transfers).

---

## 3. Blockchain Integration (Polygon)

We utilize the Polygon network for its high throughput and negligible gas fees.

### 3.1 Deposit Flow
1.  **Address Generation:** Deterministic generation of deposit addresses per user.
2.  **Listening:** Webhooks (Alchemy/QuickNode) listen for `Transfer` events on the USDT contract.
3.  **Settlement:**
    *   Event received -> Verify Signature.
    *   Wait for Block Confirmations (Safety Threshold).
    *   Credit User Ledger (Off-chain representation).
    *   Flush to Cold Wallet (Automated sweep script).

### 3.2 Withdrawal Flow
1.  User requests withdrawal -> System checks off-chain balance.
2.  Debit User Ledger (Lock funds).
3.  Server signs transaction with Hot Wallet Private Key (HSM/Secure Env).
4.  Broadcast to Polygon Network.
5.  On success confirmation -> Mark transaction as `COMPLETED`.

---

## 4. Card Issuing Infrastructure

Integration with Stripe Issuing allows for programmable payment cards.

### 4.1 Card Creation
*   Cards are issued instantly via API.
*   Metadata is linked to the internal `User` ID for reconciliation.

### 4.2 Authorization Stream (Real-time Auth)
GlobalSecureSend acts as the Authorizing Host:
1.  Card swiped at merchant.
2.  Stripe sends `issuing_authorization.request` webhook.
3.  **Logic:**
    *   Check User Ledger Balance.
    *   Check Card Status (Active/Frozen).
    *   Check Merchant Category Code (MCC) restrictions.
4.  **Response:** `approve` or `decline` returned to Visa/Mastercard network in <200ms.

### 4.3 PCI-DSS Compliance
*   We do **not** store full PAN or CVV numbers.
*   The `/api/cards/[id]/reveal` endpoint acts as a secure proxy to fetch sensitive data directly from Stripe to the client, ephemeral and encrypted.

---

## 5. Security & Compliance

### 5.1 Identity Verification (KYC)
*   **Level 1:** Data Collection (Name, Address, DOB).
*   **Level 2:** Document Verification via **Stripe Identity**.
    *   Biometric Liveness Check.
    *   Government ID OCR & Fraud Check.
*   **Webhook Integration:** Verification status updates automatically promote user levels.

### 5.2 Authentication
*   **Session Management:** Database-backed sessions with secure cookies.
*   **2FA:** Time-based OTP (SMS/Authenticator) required for critical actions (Withdrawals, Password Change).
*   **Password Hashing:** Bcrypt with high work factor.

### 5.3 Infrastructure Security
*   **Environment Variables:** Strict separation of secrets (API Keys, Private Keys).
*   **DDoS Protection:** Vercel Edge Network.
*   **Rate Limiting:** Upstash Redis (planned) for API route protection.

---

## 6. Disaster Recovery

*   **Database Backups:** Point-in-time recovery (PITR) via NeonDB.
*   **Emergency Circuit Breaker:** Admin capability to freeze all transactions globally in case of exploit detection.
*   **Audit Logs:** Immutable logs of all admin actions and financial movements.

