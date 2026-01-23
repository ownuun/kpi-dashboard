import { NextRequest, NextResponse } from 'next/server'
import { createLink } from '@/actions/links'
import type { CreateLinkInput } from '@/types/links'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateLinkInput

    const result = await createLink(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Extension link create error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
