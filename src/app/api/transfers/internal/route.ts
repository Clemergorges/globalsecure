import { NextResponse } from "next/server" 
import { z } from "zod" 
import { createHandler } from "@/lib/api-handler" 
import { prisma } from "@/lib/db"
import { processInternalTransfer } from "@/lib/services/ledger"
import { logAudit } from "@/lib/logger"
import { createEtherFiPosition } from "@/lib/services/etherfiService"
import { ApiError } from "@/lib/api-handler"
import { checkUserCanTransact } from "@/lib/services/risk-gates"
import { getExchangeRate } from "@/lib/services/exchange"
import { determineUserRiskTier } from "@/lib/services/risk-profile"
import { getKycTierLimits } from "@/lib/services/kyc-limits"
import { UserRiskTier } from "@prisma/client"
import { getJurisdictionRules } from "@/lib/services/jurisdiction-rules"
import { isOperationalFlagEnabled } from "@/lib/services/operational-flags"

const transferSchema = z.object({ 
  toEmail: z.string().email(),
  amount: z.number().positive(), 
  currency: z.enum(["EUR", "USD", "GBP"]),
  enableYield: z.boolean().optional(),
}) 

export const POST = createHandler( 
  transferSchema, 
  async (req) => { 
    const { toEmail, amount, currency, enableYield } = req.validatedBody 
    const senderId = req.userId! // Guaranteed by requireAuth

    async function sumTransfersEur(senderId2: string, since: Date) {
      const transfers = await prisma.transfer.findMany({
        where: { senderId: senderId2, createdAt: { gte: since } },
        select: { amountSent: true, currencySent: true },
      });

      const currencies = Array.from(new Set(transfers.map((t) => t.currencySent.toUpperCase())));
      const rates = new Map<string, number>();
      for (const c of currencies) {
        if (c === 'EUR') rates.set(c, 1);
        else rates.set(c, await getExchangeRate(c, 'EUR'));
      }

      let total = 0;
      for (const t of transfers) {
        const c = t.currencySent.toUpperCase();
        const rate = rates.get(c) || 1;
        total += Number(t.amountSent) * rate;
      }
      return total;
    }

    // Fetch sender email
    const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { email: true, country: true, kycLevel: true, kycStatus: true, riskTier: true }
    });

    if (!sender) {
        throw new ApiError(404, "SENDER_NOT_FOUND", "Sender not found");
    }

    const gate = await checkUserCanTransact(senderId);
    if (!gate.allowed) {
      throw new ApiError(gate.status, gate.code, gate.code, gate.details);
    }

    const jurisdiction = getJurisdictionRules(sender.country || null);
    if (!jurisdiction.supported) {
      throw new ApiError(403, 'JURISDICTION_NOT_SUPPORTED', 'JURISDICTION_NOT_SUPPORTED');
    }

    const rateToEur = currency.toUpperCase() === 'EUR' ? 1 : await getExchangeRate(currency, 'EUR');
    const amountEur = Number(amount) * rateToEur;

    const userRiskTier = (sender as any)?.riskTier ?? null;
    const riskTier: UserRiskTier = userRiskTier ?? determineUserRiskTier(sender as any);
    const limits = getKycTierLimits((sender as any).kycLevel, riskTier);
    const caps = {
      perTxEur: Math.min(limits.effective.perTxEur, jurisdiction.limitsEur.perTxEur),
      dailyEur: Math.min(limits.effective.dailyEur, jurisdiction.limitsEur.dailyEur),
      monthlyEur: Math.min(limits.effective.monthlyEur, jurisdiction.limitsEur.monthlyEur),
    };

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const dailyTotalEur = await sumTransfersEur(senderId, dayStart);
    const monthlyTotalEur = await sumTransfersEur(senderId, monthStart);

    if (amountEur > caps.perTxEur) {
      throw new ApiError(403, 'KYC_LIMIT_TX_EXCEEDED', 'KYC_LIMIT_TX_EXCEEDED');
    }
    if (dailyTotalEur + amountEur > caps.dailyEur) {
      throw new ApiError(403, 'KYC_LIMIT_DAILY_EXCEEDED', 'KYC_LIMIT_DAILY_EXCEEDED');
    }
    if (monthlyTotalEur + amountEur > caps.monthlyEur) {
      throw new ApiError(403, 'KYC_LIMIT_MONTHLY_EXCEEDED', 'KYC_LIMIT_MONTHLY_EXCEEDED');
    }

    if (enableYield) {
      const killSwitch = await isOperationalFlagEnabled('YIELD_ALLOCATIONS_PAUSED');
      if (killSwitch) {
        await logAudit({
          userId: senderId,
          action: 'YIELD_KILL_SWITCH',
          status: 'BLOCKED',
          metadata: { code: 'YIELD_KILL_SWITCH' },
        }).catch(() => {});
        throw new ApiError(403, 'YIELD_KILL_SWITCH', 'YIELD_KILL_SWITCH');
      }

      const rawLimit = Number(process.env.YIELD_MAX_EXPOSURE_USD || '0');
      const maxExposureUsd = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 100000;
      const exposedTransfers = await prisma.transfer.findMany({
        where: { senderId, yieldPositionId: { not: null }, canceledAt: null },
        select: { amountSent: true, currencySent: true },
      });
      const currencies = Array.from(new Set(exposedTransfers.map((t) => t.currencySent.toUpperCase())));
      const rates = new Map<string, number>();
      for (const c of currencies) {
        if (c === 'USD') rates.set(c, 1);
        else rates.set(c, await getExchangeRate(c, 'USD'));
      }
      const totalExposureUsd = exposedTransfers.reduce((acc, t) => {
        const c = t.currencySent.toUpperCase();
        const rate = rates.get(c) || 1;
        return acc + Number(t.amountSent) * rate;
      }, 0);

      if (totalExposureUsd >= maxExposureUsd) {
        await logAudit({
          userId: senderId,
          action: 'YIELD_EXPOSURE_BLOCK',
          status: 'BLOCKED',
          metadata: { totalExposureUsd, maxExposureUsd },
        }).catch(() => {});
        throw new ApiError(403, 'YIELD_EXPOSURE_LIMIT', 'YIELD_EXPOSURE_LIMIT');
      }
    }

    // Execute transfer using the ledger service (ACID compliant)
    const transfer = await processInternalTransfer(
        senderId,
        sender.email,
        toEmail,
        amount,
        currency
    );

    if (enableYield === true && transfer?.transfer?.id) {
      try {
        const created = await createEtherFiPosition({
          transferId: transfer.transfer.id,
          userId: senderId,
          amount,
          currency,
        });

        await prisma.transfer.update({
          where: { id: transfer.transfer.id },
          data: { yieldPositionId: created.positionId },
        });
      } catch (err: any) {
        await logAudit({
          userId: senderId,
          action: 'ETHERFI_CREATE_FAILED',
          status: 'ERROR',
          metadata: { transferId: transfer.transfer.id, message: String(err?.message || err) },
        });
      }
    }

    return NextResponse.json({ success: true, transfer }) 
  }, 
  { 
    rateLimit: { key: "transfer", limit: 5, window: 60 }, 
    requireAuth: true, 
  }, 
) 
