import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { suggestTags } from '@/actions/ai-tags'
import { createLink } from '@/actions/links'
import type { LinkOwnerType, CreateLinkInput } from '@/types/links'

interface QuickSaveRequest {
  url: string
  title: string
  favicon?: string
  ownerTypes: LinkOwnerType[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as QuickSaveRequest
    const { url, title, favicon, ownerTypes } = body

    if (!url || !title || ownerTypes.length === 0) {
      return NextResponse.json(
        { error: 'url, title, ownerTypes are required' },
        { status: 400 }
      )
    }

    const results: Array<{ ownerType: LinkOwnerType; success: boolean; error?: string }> = []

    for (const ownerType of ownerTypes) {
      const tagResult = await suggestTags(url, title, ownerType)
      const tagIds = tagResult.success ? tagResult.data.tagIds : []

      const linkInput: CreateLinkInput = {
        url,
        title,
        favicon: favicon || undefined,
        ownerType,
        tagIds,
      }

      const createResult = await createLink(linkInput)

      if (createResult.success) {
        results.push({ ownerType, success: true })
      } else {
        results.push({ ownerType, success: false, error: createResult.error })
      }
    }

    const allSuccess = results.every((r) => r.success)
    const anySuccess = results.some((r) => r.success)

    if (allSuccess) {
      return NextResponse.json({ success: true, results })
    } else if (anySuccess) {
      return NextResponse.json({ success: true, partial: true, results })
    } else {
      return NextResponse.json(
        { success: false, error: '링크 저장에 실패했습니다', results },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Extension quick save error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
