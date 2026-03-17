import { NextApiRequest, NextApiResponse } from 'next'

type RateLimitEntry = {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key)
  }
}, 60_000)

type RateLimitOptions = {
  windowMs?: number  // Time window in ms (default: 60000 = 1 minute)
  max?: number       // Max requests per window (default: 30)
  keyPrefix?: string // Prefix for the key (to separate different endpoints)
}

/**
 * Simple in-memory rate limiter.
 * Returns true if the request should be blocked.
 */
export function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  options: RateLimitOptions = {}
): boolean {
  const { windowMs = 60_000, max = 30, keyPrefix = '' } = options

  const forwarded = req.headers['x-forwarded-for']
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || 'unknown'
  const key = `${keyPrefix}:${ip}`

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs })
    return false
  }

  entry.count++
  if (entry.count > max) {
    res.status(429).json({ error: 'Too many requests, please try again later' })
    return true
  }

  return false
}
