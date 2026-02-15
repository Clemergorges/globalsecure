
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const personalSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dateOfBirth: z.string().refine((date) => {
    const dob = new Date(date);
    const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 18;
  }, { message: "Você deve ter pelo menos 18 anos" }),
  countryOfBirth: z.string().length(2),
  nationality: z.string().length(2),
  phone: z.string().min(8).optional(),
});

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = personalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { firstName, lastName, dateOfBirth, countryOfBirth, nationality, phone } = parsed.data;

    // Update User
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        countryOfBirth: countryOfBirth.toUpperCase(),
        nationality: nationality.toUpperCase(),
        phone,
        // If phone provided, mark as unverified until checked (optional)
        // phoneVerified: false 
      }
    });

    return NextResponse.json({ success: true, message: "Dados pessoais atualizados" });

  } catch (error) {
    console.error('Onboarding Personal Error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados' }, { status: 500 });
  }
}
