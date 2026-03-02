import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "@/lib/db"
import { logAudit, logger } from "@/lib/logger"
import { env } from "@/lib/config/env"
import { withRouteContext } from "@/lib/http/route"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    "A senha deve conter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial"
  ),
})

function hashResetToken(token: string) {
  // TODO: se preferir, use um pepper dedicado (ex.: PASSWORD_RESET_PEPPER).
  // Para hardening v1, usamos o JWT secret como secret de hashing.
  return crypto.createHash("sha256").update(`${token}.${env.jwtSecret()}`).digest("hex")
}

export const POST = withRouteContext(async (req: NextRequest, ctx) => {
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
    const tokenHash = hashResetToken(token)

    // Buscar token válido
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: tokenHash,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: { user: true },
    })

    if (!resetToken) {
      await logAudit({
        action: "PASSWORD_RESET_INVALID_TOKEN",
        status: "400",
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        path: ctx.path,
        metadata: {},
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
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      path: ctx.path,
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
}, { requireAuth: false })
