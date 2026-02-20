import { NextResponse } from "next/server" 
import { z } from "zod" 
import { createHandler } from "@/lib/api-handler" 
import { prisma } from "@/lib/db"
import { processInternalTransfer } from "@/lib/services/ledger"
import { logAudit } from "@/lib/logger"
import { createEtherFiPosition } from "@/lib/services/etherfiService"
import { ApiError } from "@/lib/api-handler"

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

    // Fetch sender email
    const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { email: true }
    });

    if (!sender) {
        throw new ApiError(404, "SENDER_NOT_FOUND", "Sender not found");
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
