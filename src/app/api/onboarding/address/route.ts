
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const addressSchema = z.object({
  streetLine1: z.string().min(5),
  streetLine2: z.string().optional(),
  city: z.string().min(2),
  postalCode: z.string().min(4),
  region: z.string().optional(),
  country: z.string().length(2)
});

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = addressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Endereço inválido', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { streetLine1, streetLine2, city, postalCode, region, country } = parsed.data;

    // Check if user already has an address
    const existingAddress = await prisma.address.findFirst({
      where: { userId: session.userId }
    });

    if (existingAddress) {
      await prisma.address.update({
        where: { id: existingAddress.id },
        data: {
          streetLine1, streetLine2, city, postalCode, region, country: country.toUpperCase(),
          status: 'UNVERIFIED' // Reset verification if address changes
        }
      });
    } else {
      await prisma.address.create({
        data: {
          userId: session.userId,
          streetLine1, streetLine2, city, postalCode, region, country: country.toUpperCase(),
          status: 'UNVERIFIED'
        }
      });
    }

    // Also update legacy address fields in User for backward compatibility if needed
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        address: streetLine1,
        city,
        postalCode,
        country: country.toUpperCase()
      }
    });

    return NextResponse.json({ success: true, message: "Endereço atualizado" });

  } catch (error) {
    console.error('Onboarding Address Error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar endereço' }, { status: 500 });
  }
}
