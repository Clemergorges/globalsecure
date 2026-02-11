import { NextResponse } from "next/server" 
import { z } from "zod" 
import { createHandler } from "@/lib/api-handler" 
import { prisma } from "@/lib/db"
import { comparePassword } from "@/lib/auth"
import { SignJWT } from "jose"

const loginSchema = z.object({ 
  email: z.string().email(), 
  password: z.string().min(6), 
}) 

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-me';

export const POST = createHandler( 
  loginSchema, 
  async (req) => { 
    const { email, password } = req.validatedBody 

    // 1. Find User
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 2. Verify Password
    const isValid = await comparePassword(password, user.passwordHash);
    
    if (!isValid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }



    // 3. Generate Token (JOSE)
    // Check if user is admin (hardcoded for now based on env or specific email)
    const isAdmin = email === process.env.ADMIN_EMAIL || email === 'clemergorges@hotmail.com';
    const role = isAdmin ? 'ADMIN' : 'USER';

    const token = await new SignJWT({ 
        userId: user.id, 
        email: user.email, 
        role: role
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(new TextEncoder().encode(JWT_SECRET));

    // 4. Create Session Record
    // Skip session creation for now to rule out DB write lock
    /*
    try {
        await prisma.session.create({
            data: {
                userId: user.id,
                token: token,
                ipAddress: req.headers.get("x-forwarded-for") || "unknown",
                userAgent: req.headers.get("user-agent") || "unknown",
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        });
    } catch (sessionError) {
        console.error("Session creation failed", sessionError);
    }
    */

    // 5. Set Cookie (HttpOnly)
    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
    response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 // 1 day
    });

    console.log('🔹 Login successful, returning response'); // Debug log
    return response;
  }, 
  { 
    rateLimit: { key: "login", limit: 20, window: 60 * 15 }, // Relaxed rate limit for testing
    requireAuth: false, 
  }, 
) 
