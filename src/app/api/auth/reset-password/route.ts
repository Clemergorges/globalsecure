import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { logAudit, logger } from "@/lib/logger"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    "A senha deve conter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial"
  ),
})

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  const userAgent = req.headers.get("user-agent") || "unknown"

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data

    // Buscar token válido
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: { user: true },
    })

    if (!resetToken) {
      await logAudit({
        action: "PASSWORD_RESET_INVALID_TOKEN",
        status: "400",
        ipAddress: ip,
        userAgent,
        path: "/api/auth/reset-password",
        metadata: { token: token.substring(0, 8) + "..." },
      })
      
      return NextResponse.json(
        { error: "Token inválido ou expirado" },
        { status: 400 }
      )
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Atualizar senha do usuário e marcar token como usado
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ])

    await logAudit({
      userId: resetToken.userId,
      action: "PASSWORD_RESET_SUCCESS",
      status: "200",
      ipAddress: ip,
      userAgent,
      path: "/api/auth/reset-password",
    })

    return NextResponse.json(
      { success: true, message: "Senha redefinida com sucesso" },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error({ err: error?.message || String(error) }, "reset-password error")
    return NextResponse.json(
      { error: "Não foi possível redefinir a senha. Tente novamente." },
      { status: 500 }
    )
  }
}