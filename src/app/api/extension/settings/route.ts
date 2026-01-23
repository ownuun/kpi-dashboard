import { NextRequest, NextResponse } from 'next/server'
import { getLinkSaveSettings, updateLinkSaveSettings } from '@/actions/link-settings'
import type { LinkSaveSettings } from '@/types/links'

export async function GET() {
  try {
    const result = await getLinkSaveSettings()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Extension settings fetch error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LinkSaveSettings

    const result = await updateLinkSaveSettings(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Extension settings update error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
