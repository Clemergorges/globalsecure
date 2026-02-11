import { NextResponse } from "next/server" 
import { z } from "zod" 
import { createHandler } from "@/lib/api-handler" 
import { prisma } from "@/lib/db"
import { processInternalTransfer } from "@/lib/services/ledger"

const transferSchema = z.object({ 
  toEmail: z.string().email(),
  amount: z.number().positive(), 
  currency: z.enum(["EUR", "USD", "GBP"]), 
}) 

export const POST = createHandler( 
  transferSchema, 
  async (req) => { 
    const { toEmail, amount, currency } = req.validatedBody 
    const senderId = req.userId! // Guaranteed by requireAuth

    // Fetch sender email
    const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { email: true }
    });

    if (!sender) {
        return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    // Execute transfer using the ledger service (ACID compliant)
    const transfer = await processInternalTransfer(
        senderId,
        sender.email,
        toEmail,
        amount,
        currency
    );

    return NextResponse.json({ success: true, transfer }) 
  }, 
  { 
    rateLimit: { key: "transfer", limit: 5, window: 60 }, 
    requireAuth: true, 
  }, 
) 
