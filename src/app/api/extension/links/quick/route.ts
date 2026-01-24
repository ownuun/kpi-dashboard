import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { suggestFolder } from '@/actions/ai-folders'
import { createLink } from '@/actions/links'
import { getFolders } from '@/actions/link-folders'
import type { LinkOwnerType, CreateLinkInput } from '@/types/links'

interface QuickSaveRequest {
  url: string
  title: string
  favicon?: string
  ownerTypes: LinkOwnerType[]
  folderId?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as QuickSaveRequest
    const { url, title, favicon, ownerTypes, folderId: providedFolderId } = body

    if (!url || !title || ownerTypes.length === 0) {
      return NextResponse.json(
        { error: 'url, title, ownerTypes are required' },
        { status: 400 }
      )
    }

    const results: Array<{ ownerType: LinkOwnerType; success: boolean; error?: string }> = []

    for (const ownerType of ownerTypes) {
      let folderId = providedFolderId

      if (!folderId) {
        const folderResult = await suggestFolder(url, title, ownerType)
        if (folderResult.success) {
          folderId = folderResult.data.folderId
        }
      }

      if (!folderId) {
        const foldersResult = await getFolders(ownerType)
        if (foldersResult.success && foldersResult.data.length > 0) {
          folderId = foldersResult.data[0].id
        }
      }

      if (!folderId) {
        results.push({ ownerType, success: false, error: '폴더가 없습니다. 먼저 폴더를 만들어주세요.' })
        continue
      }

      const linkInput: CreateLinkInput = {
        url,
        title,
        favicon: favicon || undefined,
        ownerType,
        folderId,
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
