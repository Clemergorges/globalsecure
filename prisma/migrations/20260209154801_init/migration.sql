-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('CREDIT', 'DEBIT', 'WITHDRAW', 'REFUND', 'FEE', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('CARD', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CryptoStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CREDITED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WithdrawStatus" AS ENUM ('PENDING', 'BROADCASTED', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycLevel" INTEGER NOT NULL DEFAULT 0,
    "kycStatus" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "gdprConsent" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsentAt" TIMESTAMP(3),
    "country" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Luxembourg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "cryptoAddress" TEXT,
    "cryptoAddressIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Balance" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTxType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "description" TEXT NOT NULL,
    "transferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientId" TEXT,
    "amountSent" DECIMAL(12,2) NOT NULL,
    "currencySent" TEXT NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL,
    "feePercentage" DECIMAL(5,2) NOT NULL DEFAULT 1.8,
    "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "amountReceived" DECIMAL(12,2) NOT NULL,
    "currencyReceived" TEXT NOT NULL,
    "type" "TransferType" NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "amlCheckPassed" BOOLEAN NOT NULL DEFAULT false,
    "amlCheckAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualCard" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "userId" TEXT,
    "stripeCardId" TEXT NOT NULL,
    "stripeCardholderId" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'visa',
    "expMonth" INTEGER NOT NULL,
    "expYear" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "amountUsed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "CardStatus" NOT NULL DEFAULT 'ACTIVE',
    "activationToken" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "VirtualCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpendTransaction" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "stripeAuthId" TEXT NOT NULL,
    "stripeTxId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "merchantName" TEXT,
    "merchantCategory" TEXT,
    "merchantCity" TEXT,
    "merchantCountry" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpendTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardActivationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardActivationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KYCDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" TEXT,
    "documentNumber" TEXT NOT NULL,
    "issuingCountry" TEXT NOT NULL,
    "frontImageUrl" TEXT,
    "backImageUrl" TEXT,
    "selfieUrl" TEXT,
    "stripeVerificationId" TEXT,
    "status" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KYCDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OTP" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EMAIL',
    "channel" TEXT,
    "target" TEXT,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLog" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "actorId" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoDeposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'POLYGON',
    "token" TEXT NOT NULL DEFAULT 'USDT',
    "amount" DECIMAL(18,6) NOT NULL,
    "status" "CryptoStatus" NOT NULL DEFAULT 'PENDING',
    "walletTxId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "creditedAt" TIMESTAMP(3),

    CONSTRAINT "CryptoDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopUp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoWithdraw" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "toAddress" TEXT NOT NULL,
    "txHash" TEXT,
    "status" "WithdrawStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoWithdraw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Swap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAsset" TEXT NOT NULL,
    "toAsset" TEXT NOT NULL,
    "fromAmount" DECIMAL(18,6) NOT NULL,
    "toAmount" DECIMAL(18,6) NOT NULL,
    "rateBase" DECIMAL(18,6) NOT NULL,
    "spread" DECIMAL(18,6) NOT NULL,
    "rateApplied" DECIMAL(18,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Swap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_country_idx" ON "User"("country");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_cryptoAddress_key" ON "Wallet"("cryptoAddress");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Balance_walletId_idx" ON "Balance"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "Balance_walletId_currency_key" ON "Balance"("walletId", "currency");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_transferId_idx" ON "WalletTransaction"("transferId");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transfer_senderId_idx" ON "Transfer"("senderId");

-- CreateIndex
CREATE INDEX "Transfer_recipientId_idx" ON "Transfer"("recipientId");

-- CreateIndex
CREATE INDEX "Transfer_recipientEmail_idx" ON "Transfer"("recipientEmail");

-- CreateIndex
CREATE INDEX "Transfer_status_idx" ON "Transfer"("status");

-- CreateIndex
CREATE INDEX "Transfer_createdAt_idx" ON "Transfer"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualCard_transferId_key" ON "VirtualCard"("transferId");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualCard_stripeCardId_key" ON "VirtualCard"("stripeCardId");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualCard_activationToken_key" ON "VirtualCard"("activationToken");

-- CreateIndex
CREATE INDEX "VirtualCard_stripeCardId_idx" ON "VirtualCard"("stripeCardId");

-- CreateIndex
CREATE INDEX "VirtualCard_userId_idx" ON "VirtualCard"("userId");

-- CreateIndex
CREATE INDEX "VirtualCard_status_idx" ON "VirtualCard"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SpendTransaction_stripeAuthId_key" ON "SpendTransaction"("stripeAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "SpendTransaction_stripeTxId_key" ON "SpendTransaction"("stripeTxId");

-- CreateIndex
CREATE INDEX "SpendTransaction_cardId_idx" ON "SpendTransaction"("cardId");

-- CreateIndex
CREATE INDEX "SpendTransaction_createdAt_idx" ON "SpendTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CardActivationToken_token_key" ON "CardActivationToken"("token");

-- CreateIndex
CREATE INDEX "CardActivationToken_token_idx" ON "CardActivationToken"("token");

-- CreateIndex
CREATE INDEX "CardActivationToken_cardId_idx" ON "CardActivationToken"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "KYCDocument_stripeVerificationId_key" ON "KYCDocument"("stripeVerificationId");

-- CreateIndex
CREATE INDEX "KYCDocument_userId_idx" ON "KYCDocument"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "OTP_target_code_idx" ON "OTP"("target", "code");

-- CreateIndex
CREATE INDEX "OTP_userId_idx" ON "OTP"("userId");

-- CreateIndex
CREATE INDEX "TransactionLog_transferId_idx" ON "TransactionLog"("transferId");

-- CreateIndex
CREATE INDEX "TransactionLog_createdAt_idx" ON "TransactionLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoDeposit_txHash_key" ON "CryptoDeposit"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoDeposit_walletTxId_key" ON "CryptoDeposit"("walletTxId");

-- CreateIndex
CREATE INDEX "CryptoDeposit_userId_idx" ON "CryptoDeposit"("userId");

-- CreateIndex
CREATE INDEX "CryptoDeposit_txHash_idx" ON "CryptoDeposit"("txHash");

-- CreateIndex
CREATE INDEX "CryptoDeposit_status_idx" ON "CryptoDeposit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TopUp_stripeSessionId_key" ON "TopUp"("stripeSessionId");

-- CreateIndex
CREATE INDEX "TopUp_userId_idx" ON "TopUp"("userId");

-- CreateIndex
CREATE INDEX "TopUp_stripeSessionId_idx" ON "TopUp"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_runAt_idx" ON "Job"("runAt");

-- CreateIndex
CREATE INDEX "CryptoWithdraw_userId_idx" ON "CryptoWithdraw"("userId");

-- CreateIndex
CREATE INDEX "CryptoWithdraw_status_idx" ON "CryptoWithdraw"("status");

-- CreateIndex
CREATE INDEX "Swap_userId_idx" ON "Swap"("userId");

-- CreateIndex
CREATE INDEX "Swap_createdAt_idx" ON "Swap"("createdAt");
