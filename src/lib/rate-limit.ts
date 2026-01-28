type RateLimitConfig = {
  windowMs: number
  maxRequests: number
}

type RateLimitEntry = {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL = 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
  lastCleanup = now
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetTime: number } {
  cleanup()

  const now = Date.now()
  const key = identifier
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, newEntry)
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    }
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  entry.count++
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

export const RATE_LIMITS = {
  general: {
    windowMs: 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_GENERAL || '100'),
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_AUTH || '10'),
  },
  metadata: {
    windowMs: 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_METADATA || '20'),
  },
} as const

export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  return 'unknown'
}
