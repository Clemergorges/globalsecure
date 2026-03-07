# GlobalSecureSend - Official Demo Script

**Target Duration:** 5 Minutes
**Persona:** "Alex" (A freelance designer based in Brazil working for clients in the US/Europe).

---

## Phase 1: Introduction (0:00 - 0:45)
**Visual:** Landing Page / Login Screen.
**Narrator:** "Meet Alex. He's a top-tier designer, but getting paid globally is a nightmare. High fees, slow banks. Today, we're showing how GlobalSecureSend changes that."

**Action:**
1.  Navigate to Login Page.
2.  Briefly mention the clean, secure interface.

---

## Phase 2: Onboarding & KYC (0:45 - 1:30)
**Visual:** Dashboard (Empty State) -> Settings -> KYC.
**Narrator:** "First, compliance. We don't cut corners, but we make it fast."

**Action:**
1.  Log in as a new user.
2.  Go to **Settings > Identity Verification**.
3.  Show the **Level 0 (Unverified)** status.
4.  Click **"Verify Identity"**.
5.  *Simulate Upload:* Upload a demo ID and Selfie.
6.  **Admin Switch:** (Backend/Admin Panel) Briefly show the Admin approving the doc.
7.  **Refresh User UI:** Show status change to **Level 2 (Verified)**. "In seconds, Alex is ready to transact globally."

---

## Phase 3: The Deposit (Crypto/Fiat Bridge) (1:30 - 2:30)
**Visual:** Wallet Dashboard.
**Narrator:** "Alex needs to get paid. His client prefers paying in USDT because it's instant."

**Action:**
1.  Click **"Deposit"**.
2.  Select **USDT (Polygon)**.
3.  Show the QR Code/Address generation.
4.  *Simulation:* Trigger a background script (or use the simulation button) to simulate an incoming transfer of 1,000 USDT.
5.  **Wait for Notification:** A toaster notification pops up: *"Deposit Received: +1,000.00 USDT"*.
6.  Show the Balance updating in real-time without refreshing (Pusher integration).

---

## Phase 4: Spending Power (Virtual Cards) (2:30 - 3:30)
**Visual:** Cards Tab.
**Narrator:** "Now Alex has USDT, but he needs to pay for his Figma subscription in USD."

**Action:**
1.  Go to **Cards**.
2.  Click **"Create Virtual Card"**.
3.  Card appears instantly on screen.
4.  Click **"Reveal Details"**.
5.  Show the secure retrieval of PAN/CVV (masked initially, then revealed).
6.  Explain: "This card is funded directly by his wallet balance. No pre-loading needed."

---

## Phase 5: Global Transfer (3:30 - 4:15)
**Visual:** Send Money Tab.
**Narrator:** "Alex also wants to send money to his developer partner in Europe."

**Action:**
1.  Go to **Transfers**.
2.  Select **Internal Transfer** (or Email transfer).
3.  Enter Recipient Email (e.g., `dev@partner.com`).
4.  Enter Amount: `500 EUR`.
5.  Show the **Instant Quote** (USDT -> EUR conversion rate).
6.  Click **Send**.
7.  **Success Screen:** "Transfer Complete."
8.  Show Transaction History log.

---

## Phase 6: Conclusion (4:15 - 5:00)
**Visual:** Dashboard Overview.
**Narrator:** "In under 5 minutes, Alex received crypto, converted it, created a Visa card, and paid a contractor. Zero bank visits. Zero 3-day waits. This is GlobalSecureSend."

**End Scene.**
