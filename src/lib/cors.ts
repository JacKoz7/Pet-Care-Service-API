// lib/cors.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function withCors(handler: (req: NextRequest) => Promise<Response>) {
  return async function (req: NextRequest) {
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    const res = await handler(req)
    res.headers.set('Access-Control-Allow-Origin', '*')
    return res
  }
}
