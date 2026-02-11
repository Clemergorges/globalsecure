import { NextRequest } from "next/server" 
import { z, ZodSchema } from "zod" 
 
export function validateHeaders<T>( 
  req: NextRequest, 
  schema: ZodSchema<T>, 
): T { 
  const headersObj: Record<string, string> = {} 
  req.headers.forEach((value, key) => { 
    headersObj[key] = value 
  }) 
  return schema.parse(headersObj) 
} 
 
export function validateQuery<T>( 
  req: NextRequest, 
  schema: ZodSchema<T>, 
): T { 
  const url = new URL(req.url) 
  const paramsObj: Record<string, string> = {} 
  url.searchParams.forEach((value, key) => { 
    paramsObj[key] = value 
  }) 
  return schema.parse(paramsObj) 
} 
