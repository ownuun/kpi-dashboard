import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit'

// Private IP ranges that should be blocked (SSRF protection)
function isPrivateIP(hostname: string): boolean {
  // Check for localhost variants
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  ) {
    return true
  }

  // Check for private IP ranges
  const parts = hostname.split('.').map(Number)
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    // 10.0.0.0/8
    if (parts[0] === 10) return true
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true
    // 169.254.0.0/16 (link-local / AWS metadata)
    if (parts[0] === 169 && parts[1] === 254) return true
    // 127.0.0.0/8
    if (parts[0] === 127) return true
  }

  // Block cloud metadata endpoints
  if (
    hostname === 'metadata.google.internal' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    return true
  }

  return false
}

function isValidUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString)

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' }
    }

    // Check for private/internal IPs
    if (isPrivateIP(url.hostname)) {
      return { valid: false, error: 'Access to internal addresses is not allowed' }
    }

    // Limit URL length
    if (urlString.length > 2048) {
      return { valid: false, error: 'URL is too long' }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientIP = getClientIP(request)
  const rateLimitResult = rateLimit(`metadata:${clientIP}`, RATE_LIMITS.metadata)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        }
      }
    )
  }

  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // Validate URL (SSRF protection)
  const validation = isValidUrl(url)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkBot/1.0)',
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timeoutId)

    // Limit response size (1MB max)
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      return NextResponse.json({ error: 'Response too large' }, { status: 400 })
    }

    const html = await response.text()

    // Limit HTML size after fetching (in case content-length wasn't provided)
    if (html.length > 1024 * 1024) {
      // Parse only first 100KB for metadata
      const truncatedHtml = html.substring(0, 100 * 1024)
      return parseMetadata(truncatedHtml, url)
    }

    return parseMetadata(html, url)
  } catch (error) {
    console.error('Metadata fetch error:', error)
    // Graceful fallback: return hostname as title
    try {
      const urlObj = new URL(url)
      return NextResponse.json({
        title: urlObj.hostname.replace('www.', ''),
        favicon: urlObj.origin + '/favicon.ico',
      })
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
  }
}

function parseMetadata(html: string, url: string) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname

  const ogTitleMatch =
    html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
  const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : null

  const faviconMatch =
    html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i)

  let favicon = null
  if (faviconMatch) {
    const faviconHref = faviconMatch[1]
    if (faviconHref.startsWith('http')) {
      favicon = faviconHref
    } else if (faviconHref.startsWith('//')) {
      favicon = 'https:' + faviconHref
    } else if (faviconHref.startsWith('/')) {
      const urlObj = new URL(url)
      favicon = urlObj.origin + faviconHref
    } else {
      const urlObj = new URL(url)
      favicon = urlObj.origin + '/' + faviconHref
    }
  } else {
    const urlObj = new URL(url)
    favicon = urlObj.origin + '/favicon.ico'
  }

  return NextResponse.json({
    title: ogTitle || title,
    favicon,
  })
}
