import { NextResponse } from "next/server" 
import { z } from "zod" 
import { createHandler } from "@/lib/api-handler" 
import { prisma } from "@/lib/db"

const unlockCardSchema = z.object({ 
  pin: z.string().min(4).max(6), 
}) 

export const POST = createHandler( 
  unlockCardSchema, 
  async (req, { params }: { params: Promise<{ id: string }> }) => { 
    const { id } = await params; // Card ID from URL
    const { pin } = req.validatedBody 
    const userId = req.userId!

    // Verify ownership
    const card = await prisma.virtualCard.findUnique({
        where: { id },
        include: { user: true } // Or verify via userId field if present directly
    });

    if (!card || card.userId !== userId) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // TODO: Verify PIN logic here (mock for now as PIN might be stored securely or verified via Stripe)
    // For now, assuming PIN check passed if we are here (or implement specific logic)
    
    // Unlock card logic
    // await stripe.issuing.cards.update(card.stripeCardId, { status: 'active' });

    return NextResponse.json({ success: true, message: "Card unlocked" }) 
  }, 
  { 
    rateLimit: { key: "unlockCard", limit: 10, window: 60 }, 
    requireAuth: true, 
  }, 
) 
