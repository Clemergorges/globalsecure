import { NextRequest, NextResponse } from "next/server" 
import { z, ZodSchema } from "zod" 
import { redis } from "./redis" 
import { logger, logAudit } from "./logger" 
import * as Sentry from "@sentry/nextjs" 
import { extractUserId } from "./auth"

type RateLimitConfig = { 
  key: string 
  limit: number 
  window: number // seconds 
} 

type HandlerOptions<T> = { 
  rateLimit?: RateLimitConfig 
  requireAuth?: boolean
  schema?: ZodSchema<T> 
} 

type AppHandler<TBody = any> = ( 
  req: NextRequest & { validatedBody: TBody; userId?: string }, 
  params?: any
) => Promise<NextResponse> 

async function applyRateLimit( 
  req: NextRequest, 
  cfg: RateLimitConfig, 
): Promise<boolean> { 
  const ip = req.headers.get("x-forwarded-for") ?? "unknown" 
  const key = `rl:${cfg.key}:${ip}` 
  const now = Math.floor(Date.now() / 1000) 

  try {
      const tx = redis.multi() 
      tx.zRemRangeByScore(key, 0, now - cfg.window) 
      tx.zAdd(key, { score: now, value: `${now}-${Math.random()}` }) // Unique value for sorted set
      tx.zCard(key) 
      tx.expire(key, cfg.window) 

      const results = await tx.exec() 
      // results is array of [error, result] or just results depending on client version
      // redis v4: results is array of results. 
      // zCard is at index 2.
      if (!results) return true; // Fail open if redis fails?
      
      const count = results[2] as number;
      return count <= cfg.limit 
  } catch (e) {
      console.error("Rate limit redis error", e);
      return true; // Fail open
  }
} 

export function createHandler<TBody>( 
  schema: ZodSchema<TBody>, 
  handler: AppHandler<TBody>, 
  options: HandlerOptions<TBody> = {}, 
) { 
  return async (req: NextRequest, params?: any): Promise<NextResponse> => { 
    const start = Date.now() 
    const requestId = req.headers.get("x-request-id") ?? "unknown" 
    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown"
    const userAgent = req.headers.get("user-agent") ?? "unknown"
    const method = req.method
    const path = req.nextUrl.pathname

    // Capture userId from token if present, even if auth not required
    let userId: string | undefined = undefined;
    try {
        userId = await extractUserId(req);
    } catch {}

    try { 
      // 1. Rate Limit
      if (options.rateLimit) { 
        const ok = await applyRateLimit(req, options.rateLimit) 
        if (!ok) { 
          logger.warn({ requestId }, "Rate limit exceeded") 
          
          // Log to DB
          await logAudit({
              userId,
              action: "RATE_LIMIT",
              status: "429",
              ipAddress,
              userAgent,
              method,
              path,
              metadata: { limit: options.rateLimit.limit, window: options.rateLimit.window },
              duration: Date.now() - start
          });

          return NextResponse.json( 
            { error: "Too many requests" }, 
            { status: 429 }, 
          ) 
        } 
      } 

      // 2. Auth Check
      if (options.requireAuth) {
        if (!userId) {
             logger.warn({ requestId }, "Unauthorized request");
             
             // Log to DB
             await logAudit({
                 action: "AUTH_FAILURE",
                 status: "401",
                 ipAddress,
                 userAgent,
                 method,
                 path,
                 duration: Date.now() - start
             });

             return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        (req as any).userId = userId;
      } else if (userId) {
          (req as any).userId = userId;
      }

      // 3. Validation
      const body = (await req.json().catch(() => ({}))) as unknown 
      const validatedBody = schema.parse(body) 

      const extendedReq = req as NextRequest & { validatedBody: TBody } 
      extendedReq.validatedBody = validatedBody 

      // 4. Handler Execution
      const res = await handler(extendedReq, params) 

      const duration = Date.now() - start 
      logger.info( 
        { requestId, duration, status: res.status }, 
        `Request handled successfully in ${duration}ms`, 
      ) 
      
      // Determine action name from path or default
      const actionName = path.split('/').pop()?.toUpperCase() || "API_REQUEST";
      
      // Log Success to DB (Non-blocking)
      logAudit({
          userId,
          action: actionName,
          status: res.status.toString(),
          ipAddress,
          userAgent,
          method,
          path,
          metadata: { status: res.status },
          duration
      });

      return res 
    } catch (err: any) { 
      const duration = Date.now() - start 

      if (err instanceof z.ZodError) { 
        logger.warn( 
          { requestId, duration, issues: err.issues }, 
          "Validation error", 
        ) 
        
        await logAudit({
            userId,
            action: "VALIDATION_ERROR",
            status: "400",
            ipAddress,
            userAgent,
            method,
            path,
            metadata: { issues: err.issues },
            duration
        });

        return NextResponse.json( 
          { error: "Invalid request", issues: err.issues }, 
          { status: 400 }, 
        ) 
      } 

      logger.error( 
        { requestId, duration, err }, 
        "Unhandled error in handler", 
      ) 
      Sentry.captureException(err) 

      await logAudit({
          userId,
          action: "SERVER_ERROR",
          status: "500",
          ipAddress,
          userAgent,
          method,
          path,
          metadata: { error: err.message },
          duration
      });

      return NextResponse.json( 
        { error: "Internal server error" }, 
        { status: 500 }, 
      ) 
    } 
  } 
} 
