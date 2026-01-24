import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkBot/1.0)',
      },
      signal: AbortSignal.timeout(5000),
    })

    const html = await response.text()
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname

    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
    const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : null

    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
      || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i)
    
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
  } catch (error) {
    console.error('Metadata fetch error:', error)
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
