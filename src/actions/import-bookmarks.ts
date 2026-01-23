'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { ChromeBookmarkNode, FolderToTagMapping, LinkOwnerType } from '@/types/links'

interface ImportResult {
  imported: number
  skipped: number
  tagsCreated: number
}

function extractBookmarks(
  node: ChromeBookmarkNode,
  parentPath: string = ''
): Array<{ url: string; title: string; folderPath: string }> {
  const results: Array<{ url: string; title: string; folderPath: string }> = []
  const currentPath = parentPath ? `${parentPath}/${node.title}` : node.title

  if (node.url) {
    results.push({
      url: node.url,
      title: node.title,
      folderPath: parentPath,
    })
  }

  if (node.children) {
    for (const child of node.children) {
      results.push(...extractBookmarks(child, currentPath))
    }
  }

  return results
}

function getFolderPaths(node: ChromeBookmarkNode, parentPath: string = ''): string[] {
  const paths: string[] = []
  const currentPath = parentPath ? `${parentPath}/${node.title}` : node.title

  if (node.children && node.children.length > 0) {
    paths.push(currentPath)
    for (const child of node.children) {
      paths.push(...getFolderPaths(child, currentPath))
    }
  }

  return paths
}

export async function getBookmarkFolderPaths(
  bookmarks: ChromeBookmarkNode[]
): Promise<ActionResult<string[]>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const allPaths: string[] = []
    for (const root of bookmarks) {
      allPaths.push(...getFolderPaths(root))
    }

    const uniquePaths = [...new Set(allPaths)].sort()
    return { success: true, data: uniquePaths }
  } catch (error) {
    console.error('getBookmarkFolderPaths error:', error)
    return { success: false, error: '폴더 경로 추출에 실패했습니다' }
  }
}

export async function importChromeBookmarks(
  bookmarks: ChromeBookmarkNode[],
  ownerType: LinkOwnerType,
  folderToTagMapping: FolderToTagMapping[]
): Promise<ActionResult<ImportResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    if (ownerType === 'TEAM' && !session.user.teamId) {
      return { success: false, error: '팀에 소속되어 있지 않습니다' }
    }

    const allBookmarks: Array<{ url: string; title: string; folderPath: string }> = []
    for (const root of bookmarks) {
      allBookmarks.push(...extractBookmarks(root))
    }

    const tagMap = new Map<string, string>()
    let tagsCreated = 0

    for (const mapping of folderToTagMapping) {
      const existingTagWhere =
        ownerType === 'PERSONAL'
          ? { userId: session.user.id, name: mapping.tagName, ownerType: 'PERSONAL' as const }
          : { teamId: session.user.teamId!, name: mapping.tagName, ownerType: 'TEAM' as const }

      let tag = await prisma.linkTag.findFirst({ where: existingTagWhere })

      if (!tag) {
        const createData =
          ownerType === 'PERSONAL'
            ? {
                name: mapping.tagName,
                color: mapping.tagColor || '#3B82F6',
                ownerType: 'PERSONAL' as const,
                userId: session.user.id,
              }
            : {
                name: mapping.tagName,
                color: mapping.tagColor || '#3B82F6',
                ownerType: 'TEAM' as const,
                teamId: session.user.teamId!,
              }

        tag = await prisma.linkTag.create({ data: createData })
        tagsCreated++
      }

      tagMap.set(mapping.folderPath, tag.id)
    }

    let imported = 0
    let skipped = 0

    for (const bookmark of allBookmarks) {
      try {
        new URL(bookmark.url)
      } catch {
        skipped++
        continue
      }

      if (bookmark.url.startsWith('javascript:') || bookmark.url.startsWith('chrome:')) {
        skipped++
        continue
      }

      const tagIds: string[] = []
      for (const [folderPath, tagId] of tagMap.entries()) {
        if (bookmark.folderPath.startsWith(folderPath) || bookmark.folderPath === folderPath) {
          tagIds.push(tagId)
        }
      }

      const existingLinkWhere =
        ownerType === 'PERSONAL'
          ? { url: bookmark.url, userId: session.user.id, ownerType: 'PERSONAL' as const }
          : { url: bookmark.url, teamId: session.user.teamId!, ownerType: 'TEAM' as const }

      const existingLink = await prisma.link.findFirst({ where: existingLinkWhere })

      if (existingLink) {
        skipped++
        continue
      }

      const createData = {
        url: bookmark.url,
        title: bookmark.title || bookmark.url,
        ownerType: ownerType as 'PERSONAL' | 'TEAM',
        createdById: session.user.id,
        ...(ownerType === 'PERSONAL'
          ? { userId: session.user.id }
          : { teamId: session.user.teamId! }),
        tags:
          tagIds.length > 0
            ? { create: tagIds.map((tagId) => ({ tagId })) }
            : undefined,
      }

      await prisma.link.create({ data: createData })
      imported++
    }

    revalidatePath('/links')
    revalidatePath('/links/tags')

    return {
      success: true,
      data: { imported, skipped, tagsCreated },
    }
  } catch (error) {
    console.error('importChromeBookmarks error:', error)
    return { success: false, error: '북마크 가져오기에 실패했습니다' }
  }
}
