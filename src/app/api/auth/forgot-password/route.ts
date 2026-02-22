import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { prisma } from "@/lib/db"
import { sendEmail, templates } from "@/lib/services/email"
import { logAudit, logger } from "@/lib/logger"

const schema = z.object({
  email: z.string().email(),
})

function maskEmail(email: string) {
  const [local, domain] = email.split("@")
  if (!domain) return "***"
  const safeLocal = (local || "").slice(0, 2)
  return `${safeLocal}***@${domain}`
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  const userAgent = req.headers.get("user-agent") || "unknown"

  let normalizedEmail = ""

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 },
      )
    }

    normalizedEmail = parsed.data.email.trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    })

    await logAudit({
      userId: user?.id,
      action: "FORGOT_PASSWORD_REQUESTED",
      status: "200",
      ipAddress: ip,
      userAgent,
      path: "/api/auth/forgot-password",
      metadata: { email: maskEmail(normalizedEmail) },
    })

    if (!user) {
      return NextResponse.json(
        { success: true, message: "Se o email existir, enviaremos instruções." },
        { status: 200 },
      )
    }

    const smtpConfigured = Boolean(
      process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.EMAIL_FROM,
    )

    if (!smtpConfigured) {
      await logAudit({
        userId: user.id,
        action: "FORGOT_PASSWORD_EMAIL_SENT",
        status: "500",
        ipAddress: ip,
        userAgent,
        path: "/api/auth/forgot-password",
        metadata: { email: maskEmail(normalizedEmail), reason: "SMTP_NOT_CONFIGURED" },
      })
      return NextResponse.json(
        { error: "Não foi possível enviar o email de recuperação. Tente novamente." },
        { status: 500 },
      )
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    const baseUrl = process.env.APP_BASE_URL || new URL(req.url).origin
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/auth/reset-password?token=${encodeURIComponent(token)}`

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: "Redefinir senha - GlobalSecureSend",
      html: templates.passwordResetLink(resetUrl),
    })

    if (!emailResult.ok) {
      await logAudit({
        userId: user.id,
        action: "FORGOT_PASSWORD_EMAIL_SENT",
        status: "500",
        ipAddress: ip,
        userAgent,
        path: "/api/auth/forgot-password",
        metadata: { email: maskEmail(normalizedEmail), error: emailResult.error },
      })
      return NextResponse.json(
        { error: "Não foi possível enviar o email de recuperação. Tente novamente." },
        { status: 500 },
      )
    }

    await logAudit({
      userId: user.id,
      action: "FORGOT_PASSWORD_EMAIL_SENT",
      status: "200",
      ipAddress: ip,
      userAgent,
      path: "/api/auth/forgot-password",
      metadata: { email: maskEmail(normalizedEmail) },
    })

    return NextResponse.json(
      { success: true, message: "Se o email existir, enviaremos instruções." },
      { status: 200 },
    )
  } catch (error: any) {
    logger.error({ err: error?.message || String(error) }, "forgot-password error")
    return NextResponse.json(
      { error: "Não foi possível enviar o email de recuperação. Tente novamente." },
      { status: 500 },
    )
  }
}
