'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { BookmarkImportNode, BookmarkImportResult, LinkOwnerType } from '@/types/links'

interface FlatBookmark {
  url: string
  title: string
  folderPath: string[]
}

interface FolderRecord {
  id: string
  name: string
  parentId: string | null
}

function extractAllBookmarks(
  node: BookmarkImportNode,
  parentPath: string[] = []
): FlatBookmark[] {
  const results: FlatBookmark[] = []
  const currentPath = node.title ? [...parentPath, node.title] : parentPath

  if (node.url) {
    results.push({
      url: node.url,
      title: node.title,
      folderPath: parentPath,
    })
  }

  if (node.children) {
    for (const child of node.children) {
      results.push(...extractAllBookmarks(child, currentPath))
    }
  }

  return results
}

function extractAllFolderPaths(
  node: BookmarkImportNode,
  parentPath: string[] = []
): string[][] {
  const paths: string[][] = []
  const currentPath = node.title ? [...parentPath, node.title] : parentPath

  if (node.children && node.children.length > 0) {
    if (node.title) {
      paths.push(currentPath)
    }
    for (const child of node.children) {
      paths.push(...extractAllFolderPaths(child, currentPath))
    }
  }

  return paths
}

export async function importChromeBookmarks(
  bookmarks: BookmarkImportNode[],
  ownerType: LinkOwnerType,
  rootFolderName?: string
): Promise<ActionResult<BookmarkImportResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    if (ownerType === 'TEAM' && !session.user.teamId) {
      return { success: false, error: '팀에 소속되어 있지 않습니다' }
    }

    const userId = session.user.id
    const teamId = session.user.teamId
    const rootPath = rootFolderName ? [rootFolderName] : []

    const allFolderPaths: string[][] = []
    const allBookmarks: FlatBookmark[] = []

    for (const root of bookmarks) {
      const folderPaths = extractAllFolderPaths(root, rootPath)
      allFolderPaths.push(...folderPaths)

      const flatBookmarks = extractAllBookmarks(root, rootPath)
      allBookmarks.push(...flatBookmarks)
    }

    if (rootFolderName) {
      allFolderPaths.unshift([rootFolderName])
    }

    const defaultFolderPath = rootPath.length > 0 ? rootPath : ['가져온 북마크']

    const validBookmarks = allBookmarks.filter((b) => {
      try {
        new URL(b.url)
        return !b.url.startsWith('javascript:') && !b.url.startsWith('chrome:')
      } catch {
        return false
      }
    })

    const hasOrphanBookmarks = validBookmarks.some((b) => b.folderPath.length === 0)
    if (hasOrphanBookmarks && !allFolderPaths.some((p) => p.join('/') === defaultFolderPath.join('/'))) {
      allFolderPaths.push(defaultFolderPath)
    }

    const uniqueFolderPaths = [...new Set(allFolderPaths.map((p) => p.join('/')))]
      .map((p) => p.split('/'))
      .sort((a, b) => a.length - b.length)

    const folderCache = new Map<string, string>()
    let foldersCreated = 0

    const existingFolders: FolderRecord[] = await prisma.linkFolder.findMany({
      where: ownerType === 'PERSONAL'
        ? { userId, ownerType: 'PERSONAL' }
        : { teamId: teamId!, ownerType: 'TEAM' },
      select: { id: true, name: true, parentId: true },
    })

    const parentIdToChildren = new Map<string | null, FolderRecord[]>()
    
    for (const folder of existingFolders) {
      const children = parentIdToChildren.get(folder.parentId) || []
      children.push(folder)
      parentIdToChildren.set(folder.parentId, children)
    }

    function buildFolderPath(folderId: string, visited = new Set<string>()): string[] {
      if (visited.has(folderId)) return []
      visited.add(folderId)
      
      const folder = existingFolders.find((f) => f.id === folderId)
      if (!folder) return []
      
      if (folder.parentId) {
        return [...buildFolderPath(folder.parentId, visited), folder.name]
      }
      return [folder.name]
    }

    for (const folder of existingFolders) {
      const path = buildFolderPath(folder.id)
      if (path.length > 0) {
        folderCache.set(path.join('/'), folder.id)
      }
    }

    for (const folderPath of uniqueFolderPaths) {
      const pathKey = folderPath.join('/')
      if (folderCache.has(pathKey)) continue

      let parentId: string | null = null
      
      for (let i = 0; i < folderPath.length; i++) {
        const partialPath = folderPath.slice(0, i + 1)
        const partialKey = partialPath.join('/')

        if (folderCache.has(partialKey)) {
          parentId = folderCache.get(partialKey)!
          continue
        }

        const name = folderPath[i]
        let newFolder: { id: string }

        if (ownerType === 'PERSONAL') {
          newFolder = await prisma.linkFolder.create({
            data: { name, ownerType: 'PERSONAL', userId, parentId },
          })
        } else {
          newFolder = await prisma.linkFolder.create({
            data: { name, ownerType: 'TEAM', teamId: teamId!, parentId },
          })
        }

        folderCache.set(partialKey, newFolder.id)
        parentId = newFolder.id
        foldersCreated++
      }
    }

    const urls = validBookmarks.map((b) => b.url)
    const existingLinks = await prisma.link.findMany({
      where: ownerType === 'PERSONAL'
        ? { url: { in: urls }, userId, ownerType: 'PERSONAL' }
        : { url: { in: urls }, teamId: teamId!, ownerType: 'TEAM' },
      select: { url: true },
    })
    const existingUrls = new Set(existingLinks.map((l) => l.url))

    const newBookmarks = validBookmarks.filter((b) => !existingUrls.has(b.url))
    
    const linksToCreate = newBookmarks.map((bookmark) => {
      const folderPath = bookmark.folderPath.length > 0 ? bookmark.folderPath : defaultFolderPath
      const folderId = folderCache.get(folderPath.join('/'))

      if (!folderId) {
        return null
      }

      return ownerType === 'PERSONAL'
        ? {
            url: bookmark.url,
            title: bookmark.title || bookmark.url,
            ownerType: 'PERSONAL' as const,
            folderId,
            userId,
            createdById: userId,
          }
        : {
            url: bookmark.url,
            title: bookmark.title || bookmark.url,
            ownerType: 'TEAM' as const,
            folderId,
            teamId: teamId!,
            createdById: userId,
          }
    }).filter((l): l is NonNullable<typeof l> => l !== null)

    if (linksToCreate.length > 0) {
      await prisma.link.createMany({
        data: linksToCreate,
        skipDuplicates: true,
      })
    }

    revalidatePath('/links')

    return {
      success: true,
      data: {
        foldersCreated,
        linksCreated: linksToCreate.length,
        errors: [],
      },
    }
  } catch (error) {
    console.error('importChromeBookmarks error:', error)
    return { success: false, error: '북마크 가져오기에 실패했습니다' }
  }
}
