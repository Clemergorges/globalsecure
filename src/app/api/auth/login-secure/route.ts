import { NextResponse } from "next/server" 
import { z } from "zod" 
import { createHandler } from "@/lib/api-handler" 
import { prisma } from "@/lib/db"
import { comparePassword } from "@/lib/auth"
import { createSession, setSessionCookie } from "@/lib/session"
import { logAudit } from "@/lib/logger"

const loginSchema = z.object({ 
  email: z.string().email(), 
  password: z.string().min(6), 
}) 

export const POST = createHandler( 
  loginSchema, 
  async (req) => { 
    const { email, password } = req.validatedBody 
    const normalizedEmail = email.toLowerCase().trim();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const method = req.method;
    const path = req.nextUrl.pathname;

    // 1. Find User & Account
    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { account: true }
    });

    if (!user) {
        logAudit({
          action: 'LOGIN_FAILURE',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          method,
          path,
          metadata: { reason: 'USER_NOT_FOUND' },
        });
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 2. Verify Password
    const isValid = await comparePassword(password, user.passwordHash);
    
    if (!isValid) {
        logAudit({
          userId: user.id,
          action: 'LOGIN_FAILURE',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          method,
          path,
          metadata: { reason: 'INVALID_PASSWORD' },
        });
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.emailVerified) {
        logAudit({
          userId: user.id,
          action: 'LOGIN_FAILURE',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          method,
          path,
          metadata: { reason: 'EMAIL_NOT_VERIFIED' },
        });
        return NextResponse.json(
            { error: "Email não verificado. Verifique seu email para continuar.", code: "EMAIL_NOT_VERIFIED" },
            { status: 403 }
        );
    }

    // 3. Create Database-Backed Session
    // The user's role from the database is now the source of truth.
    const role = user.role;

    const { token, maxAgeSeconds } = await createSession({ id: user.id, role }, ipAddress, userAgent);

    // 4. Set Cookie and Respond
    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, role } });
    setSessionCookie(response, token, maxAgeSeconds);

    // 5. Update lastLoginAt asynchronously (fire and forget)
    prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
    }).catch(console.error);

    logAudit({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: { role },
    });

    return response;
  }, 
  { 
    rateLimit: { key: "login", limit: 20, window: 60 * 15 },
    requireAuth: false, 
  }, 
) 
