'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult } from '@/types'
import type {
  LinkWithDetails,
  LinkFilters,
  PaginatedLinks,
  CreateLinkInput,
  UpdateLinkInput,
  LinkOwnerType,
  LinkFolderBasic,
} from '@/types/links'

const createLinkSchema = z.object({
  url: z.string().url('올바른 URL을 입력해주세요'),
  title: z.string().min(1, '제목을 입력해주세요').max(500),
  description: z.string().max(2000).optional(),
  favicon: z.string().url().optional().nullable(),
  rating: z.number().min(0).max(5).optional(),
  ownerType: z.enum(['PERSONAL', 'TEAM']),
  folderId: z.string().min(1, '폴더를 선택해주세요'),
})

const updateLinkSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  rating: z.number().min(0).max(5).optional(),
  folderId: z.string().optional(),
})

function transformLink(link: {
  id: string
  url: string
  title: string
  description: string | null
  favicon: string | null
  rating: number
  ownerType: string
  sortOrder: number
  folder: {
    id: string
    name: string
    icon: string | null
    ownerType: string
    parentId: string | null
    sortOrder: number
  }
  createdBy: { id: string; name: string | null; image: string | null }
  views?: { user: { id: string; name: string | null; image: string | null } }[]
  sourceTeamLinkId: string | null
  createdAt: Date
  updatedAt: Date
}): LinkWithDetails {
  return {
    id: link.id,
    url: link.url,
    title: link.title,
    description: link.description,
    favicon: link.favicon,
    rating: link.rating,
    ownerType: link.ownerType as LinkOwnerType,
    sortOrder: link.sortOrder,
    folder: {
      id: link.folder.id,
      name: link.folder.name,
      icon: link.folder.icon,
      ownerType: link.folder.ownerType as LinkOwnerType,
      parentId: link.folder.parentId,
      sortOrder: link.folder.sortOrder,
    },
    createdBy: link.createdBy,
    viewedBy: link.views?.map(v => v.user) ?? [],
    sourceTeamLinkId: link.sourceTeamLinkId,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  }
}

export async function getLinks(
  filters: LinkFilters = {},
  page = 1,
  perPage = 20
): Promise<ActionResult<PaginatedLinks>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const where: Record<string, unknown> = {}

    // 폴더 필터
    if (filters.folderId) {
      where.folderId = filters.folderId
    }

    // 소유자 타입 필터
    if (filters.ownerType === 'PERSONAL') {
      where.ownerType = 'PERSONAL'
      where.userId = session.user.id
    } else if (filters.ownerType === 'TEAM') {
      if (!session.user.teamId) {
        return { success: false, error: '팀에 소속되어 있지 않습니다' }
      }
      where.ownerType = 'TEAM'
      where.teamId = session.user.teamId
    } else if (!filters.folderId) {
      // 폴더 필터가 없으면 전체 (개인 + 팀)
      where.OR = [
        { ownerType: 'PERSONAL', userId: session.user.id },
        ...(session.user.teamId
          ? [{ ownerType: 'TEAM', teamId: session.user.teamId }]
          : []),
      ]
    }

    if (filters.rating !== undefined && filters.rating > 0) {
      where.rating = { gte: filters.rating }
    }

    if (filters.search) {
      where.AND = [
        {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { url: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ]
    }

    if (filters.startDate) {
      where.createdAt = { ...((where.createdAt as object) || {}), gte: filters.startDate }
    }

    if (filters.endDate) {
      where.createdAt = { ...((where.createdAt as object) || {}), lte: filters.endDate }
    }

    const [links, total] = await Promise.all([
      prisma.link.findMany({
        where,
        include: {
          folder: {
            select: {
              id: true,
              name: true,
              icon: true,
              ownerType: true,
              parentId: true,
              sortOrder: true,
            },
          },
          createdBy: {
            select: { id: true, name: true, image: true },
          },
          views: {
            select: {
              user: {
                select: { id: true, name: true, image: true },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.link.count({ where }),
    ])

    return {
      success: true,
      data: {
        links: links.map(transformLink),
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    }
  } catch (error) {
    console.error('getLinks error:', error)
    return { success: false, error: '링크 목록 조회에 실패했습니다' }
  }
}

export async function getLinkById(id: string): Promise<ActionResult<LinkWithDetails>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const link = await prisma.link.findUnique({
      where: { id },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            icon: true,
            ownerType: true,
            parentId: true,
            sortOrder: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        views: {
          select: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    })

    if (!link) {
      return { success: false, error: '링크를 찾을 수 없습니다' }
    }

    const hasAccess =
      (link.ownerType === 'PERSONAL' && link.userId === session.user.id) ||
      (link.ownerType === 'TEAM' && link.teamId === session.user.teamId)

    if (!hasAccess) {
      return { success: false, error: '권한이 없습니다' }
    }

    return { success: true, data: transformLink(link) }
  } catch (error) {
    console.error('getLinkById error:', error)
    return { success: false, error: '링크 조회에 실패했습니다' }
  }
}

export async function createLink(input: CreateLinkInput): Promise<ActionResult<LinkWithDetails>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const parsed = createLinkSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { url, title, description, favicon, rating, ownerType, folderId } = parsed.data

    if (ownerType === 'TEAM' && !session.user.teamId) {
      return { success: false, error: '팀에 소속되어 있지 않습니다' }
    }

    // 폴더 존재 및 소유권 확인
    const folder = await prisma.linkFolder.findUnique({ where: { id: folderId } })
    if (!folder) {
      return { success: false, error: '폴더를 찾을 수 없습니다' }
    }

    const folderOwnerValid =
      (folder.ownerType === 'PERSONAL' && folder.userId === session.user.id) ||
      (folder.ownerType === 'TEAM' && folder.teamId === session.user.teamId)

    if (!folderOwnerValid) {
      return { success: false, error: '해당 폴더에 접근 권한이 없습니다' }
    }

    // 폴더 ownerType과 링크 ownerType 일치 확인
    if (folder.ownerType !== ownerType) {
      return { success: false, error: '폴더 유형과 링크 유형이 일치하지 않습니다' }
    }

    // 최대 sortOrder 조회
    const maxSortOrderLink = await prisma.link.findFirst({
      where: { folderId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const createData = {
      url,
      title,
      description,
      favicon,
      rating: rating ?? 0,
      ownerType: ownerType as 'PERSONAL' | 'TEAM',
      folderId,
      sortOrder: (maxSortOrderLink?.sortOrder ?? -1) + 1,
      createdById: session.user.id,
      ...(ownerType === 'PERSONAL'
        ? { userId: session.user.id }
        : { teamId: session.user.teamId! }),
    }

    const link = await prisma.link.create({
      data: createData,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            icon: true,
            ownerType: true,
            parentId: true,
            sortOrder: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        views: {
          select: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    })

    revalidatePath('/links')

    return { success: true, data: transformLink(link) }
  } catch (error) {
    console.error('createLink error:', error)
    return { success: false, error: '링크 생성에 실패했습니다' }
  }
}

export async function updateLink(
  id: string,
  input: UpdateLinkInput
): Promise<ActionResult<LinkWithDetails>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const existing = await prisma.link.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: '링크를 찾을 수 없습니다' }
    }

    const hasAccess =
      (existing.ownerType === 'PERSONAL' && existing.userId === session.user.id) ||
      (existing.ownerType === 'TEAM' && existing.teamId === session.user.teamId)

    if (!hasAccess) {
      return { success: false, error: '권한이 없습니다' }
    }

    const parsed = updateLinkSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    // 폴더 변경 시 검증
    if (parsed.data.folderId && parsed.data.folderId !== existing.folderId) {
      const newFolder = await prisma.linkFolder.findUnique({
        where: { id: parsed.data.folderId },
      })
      if (!newFolder) {
        return { success: false, error: '폴더를 찾을 수 없습니다' }
      }
      if (newFolder.ownerType !== existing.ownerType) {
        return { success: false, error: '다른 유형의 폴더로 이동할 수 없습니다' }
      }
    }

    const link = await prisma.link.update({
      where: { id },
      data: parsed.data,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            icon: true,
            ownerType: true,
            parentId: true,
            sortOrder: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        views: {
          select: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    })

    revalidatePath('/links')

    return { success: true, data: transformLink(link) }
  } catch (error) {
    console.error('updateLink error:', error)
    return { success: false, error: '링크 수정에 실패했습니다' }
  }
}

export async function deleteLink(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const existing = await prisma.link.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: '링크를 찾을 수 없습니다' }
    }

    const hasAccess =
      (existing.ownerType === 'PERSONAL' && existing.userId === session.user.id) ||
      (existing.ownerType === 'TEAM' && existing.teamId === session.user.teamId)

    if (!hasAccess) {
      return { success: false, error: '권한이 없습니다' }
    }

    await prisma.link.delete({ where: { id } })

    revalidatePath('/links')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('deleteLink error:', error)
    return { success: false, error: '링크 삭제에 실패했습니다' }
  }
}

// 링크 폴더 이동
export async function moveLink(
  id: string,
  folderId: string
): Promise<ActionResult<LinkWithDetails>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const existing = await prisma.link.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: '링크를 찾을 수 없습니다' }
    }

    const hasAccess =
      (existing.ownerType === 'PERSONAL' && existing.userId === session.user.id) ||
      (existing.ownerType === 'TEAM' && existing.teamId === session.user.teamId)

    if (!hasAccess) {
      return { success: false, error: '권한이 없습니다' }
    }

    const newFolder = await prisma.linkFolder.findUnique({ where: { id: folderId } })
    if (!newFolder) {
      return { success: false, error: '폴더를 찾을 수 없습니다' }
    }

    if (newFolder.ownerType !== existing.ownerType) {
      return { success: false, error: '다른 유형의 폴더로 이동할 수 없습니다' }
    }

    const link = await prisma.link.update({
      where: { id },
      data: { folderId },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            icon: true,
            ownerType: true,
            parentId: true,
            sortOrder: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        views: {
          select: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    })

    revalidatePath('/links')

    return { success: true, data: transformLink(link) }
  } catch (error) {
    console.error('moveLink error:', error)
    return { success: false, error: '링크 이동에 실패했습니다' }
  }
}

// 링크 순서 변경
export async function reorderLinks(
  folderId: string,
  updates: { id: string; sortOrder: number }[]
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await prisma.$transaction(
      updates.map((update) =>
        prisma.link.update({
          where: { id: update.id },
          data: { sortOrder: update.sortOrder },
        })
      )
    )

    revalidatePath('/links')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('reorderLinks error:', error)
    return { success: false, error: '링크 순서 변경에 실패했습니다' }
  }
}

// 팀 링크를 개인 폴더로 복사
export async function copyTeamLinkToPersonal(
  linkId: string,
  personalFolderId: string
): Promise<ActionResult<LinkWithDetails>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const teamLink = await prisma.link.findUnique({ where: { id: linkId } })
    if (!teamLink) {
      return { success: false, error: '링크를 찾을 수 없습니다' }
    }

    if (teamLink.ownerType !== 'TEAM') {
      return { success: false, error: '팀 링크만 복사할 수 있습니다' }
    }

    if (teamLink.teamId !== session.user.teamId) {
      return { success: false, error: '권한이 없습니다' }
    }

    const personalFolder = await prisma.linkFolder.findUnique({
      where: { id: personalFolderId },
    })

    if (!personalFolder || personalFolder.ownerType !== 'PERSONAL') {
      return { success: false, error: '개인 폴더를 찾을 수 없습니다' }
    }

    if (personalFolder.userId !== session.user.id) {
      return { success: false, error: '폴더 접근 권한이 없습니다' }
    }

    // 최대 sortOrder 조회
    const maxSortOrderLink = await prisma.link.findFirst({
      where: { folderId: personalFolderId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const copiedLink = await prisma.link.create({
      data: {
        url: teamLink.url,
        title: teamLink.title,
        description: teamLink.description,
        favicon: teamLink.favicon,
        rating: teamLink.rating,
        ownerType: 'PERSONAL',
        folderId: personalFolderId,
        sortOrder: (maxSortOrderLink?.sortOrder ?? -1) + 1,
        userId: session.user.id,
        createdById: session.user.id,
        sourceTeamLinkId: teamLink.id,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            icon: true,
            ownerType: true,
            parentId: true,
            sortOrder: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        views: {
          select: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    })

    revalidatePath('/links')

    return { success: true, data: transformLink(copiedLink) }
  } catch (error) {
    console.error('copyTeamLinkToPersonal error:', error)
    return { success: false, error: '링크 복사에 실패했습니다' }
  }
}

// 개인 링크를 팀 폴더로 복사
export async function copyPersonalLinkToTeam(
  linkId: string,
  teamFolderId: string
): Promise<ActionResult<LinkWithDetails>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!session.user.teamId) {
      return { success: false, error: '팀에 소속되어 있지 않습니다' }
    }

    const personalLink = await prisma.link.findUnique({ where: { id: linkId } })
    if (!personalLink) {
      return { success: false, error: '링크를 찾을 수 없습니다' }
    }

    if (personalLink.ownerType !== 'PERSONAL') {
      return { success: false, error: '개인 링크만 복사할 수 있습니다' }
    }

    if (personalLink.userId !== session.user.id) {
      return { success: false, error: '권한이 없습니다' }
    }

    const teamFolder = await prisma.linkFolder.findUnique({
      where: { id: teamFolderId },
    })

    if (!teamFolder || teamFolder.ownerType !== 'TEAM') {
      return { success: false, error: '팀 폴더를 찾을 수 없습니다' }
    }

    if (teamFolder.teamId !== session.user.teamId) {
      return { success: false, error: '폴더 접근 권한이 없습니다' }
    }

    // 최대 sortOrder 조회
    const maxSortOrderLink = await prisma.link.findFirst({
      where: { folderId: teamFolderId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const copiedLink = await prisma.link.create({
      data: {
        url: personalLink.url,
        title: personalLink.title,
        description: personalLink.description,
        favicon: personalLink.favicon,
        rating: personalLink.rating,
        ownerType: 'TEAM',
        folderId: teamFolderId,
        sortOrder: (maxSortOrderLink?.sortOrder ?? -1) + 1,
        teamId: session.user.teamId,
        createdById: session.user.id,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            icon: true,
            ownerType: true,
            parentId: true,
            sortOrder: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        views: {
          select: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    })

    revalidatePath('/links')

    return { success: true, data: transformLink(copiedLink) }
  } catch (error) {
    console.error('copyPersonalLinkToTeam error:', error)
    return { success: false, error: '링크 복사에 실패했습니다' }
  }
}

// 링크를 다른 폴더로 이동 또는 복사 (ownerType에 따라 자동 결정)
export async function transferLinkToFolder(
  linkId: string,
  targetFolderId: string
): Promise<ActionResult<{ action: 'moved' | 'copied'; link: LinkWithDetails }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const link = await prisma.link.findUnique({ where: { id: linkId } })
    if (!link) {
      return { success: false, error: '링크를 찾을 수 없습니다' }
    }

    const targetFolder = await prisma.linkFolder.findUnique({
      where: { id: targetFolderId },
    })
    if (!targetFolder) {
      return { success: false, error: '폴더를 찾을 수 없습니다' }
    }

    // 권한 확인
    const hasLinkAccess =
      (link.ownerType === 'PERSONAL' && link.userId === session.user.id) ||
      (link.ownerType === 'TEAM' && link.teamId === session.user.teamId)

    if (!hasLinkAccess) {
      return { success: false, error: '링크 접근 권한이 없습니다' }
    }

    const hasFolderAccess =
      (targetFolder.ownerType === 'PERSONAL' && targetFolder.userId === session.user.id) ||
      (targetFolder.ownerType === 'TEAM' && targetFolder.teamId === session.user.teamId)

    if (!hasFolderAccess) {
      return { success: false, error: '폴더 접근 권한이 없습니다' }
    }

    // 같은 ownerType이면 이동, 다르면 복사
    if (link.ownerType === targetFolder.ownerType) {
      // 이동
      const movedLink = await prisma.link.update({
        where: { id: linkId },
        data: { folderId: targetFolderId },
        include: {
          folder: {
            select: {
              id: true,
              name: true,
              icon: true,
              ownerType: true,
              parentId: true,
              sortOrder: true,
            },
          },
          createdBy: {
            select: { id: true, name: true, image: true },
          },
          views: {
            select: {
              user: {
                select: { id: true, name: true, image: true },
              },
            },
          },
        },
      })

      revalidatePath('/links')
      return { success: true, data: { action: 'moved', link: transformLink(movedLink) } }
    } else {
      // 복사
      const maxSortOrderLink = await prisma.link.findFirst({
        where: { folderId: targetFolderId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })

      const copiedLink = await prisma.link.create({
        data: {
          url: link.url,
          title: link.title,
          description: link.description,
          favicon: link.favicon,
          rating: link.rating,
          ownerType: targetFolder.ownerType as 'PERSONAL' | 'TEAM',
          folderId: targetFolderId,
          sortOrder: (maxSortOrderLink?.sortOrder ?? -1) + 1,
          createdById: session.user.id,
          ...(targetFolder.ownerType === 'PERSONAL'
            ? { userId: session.user.id, sourceTeamLinkId: link.ownerType === 'TEAM' ? link.id : null }
            : { teamId: session.user.teamId! }),
        },
        include: {
          folder: {
            select: {
              id: true,
              name: true,
              icon: true,
              ownerType: true,
              parentId: true,
              sortOrder: true,
            },
          },
          createdBy: {
            select: { id: true, name: true, image: true },
          },
          views: {
            select: {
              user: {
                select: { id: true, name: true, image: true },
              },
            },
          },
        },
      })

      revalidatePath('/links')
      return { success: true, data: { action: 'copied', link: transformLink(copiedLink) } }
    }
  } catch (error) {
    console.error('transferLinkToFolder error:', error)
    return { success: false, error: '링크 이동/복사에 실패했습니다' }
  }
}

// 일괄 생성 (북마크 가져오기용)
export async function createLinks(
  inputs: CreateLinkInput[]
): Promise<ActionResult<{ created: number; failed: number }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    let created = 0
    let failed = 0

    for (const input of inputs) {
      const result = await createLink(input)
      if (result.success) {
        created++
      } else {
        failed++
      }
    }

    revalidatePath('/links')

    return { success: true, data: { created, failed } }
  } catch (error) {
    console.error('createLinks error:', error)
    return { success: false, error: '링크 일괄 생성에 실패했습니다' }
  }
}

export async function recordLinkView(linkId: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const link = await prisma.link.findUnique({ where: { id: linkId } })
    if (!link) {
      return { success: false, error: '링크를 찾을 수 없습니다' }
    }

    if (link.ownerType !== 'TEAM') {
      return { success: true, data: undefined }
    }

    if (link.teamId !== session.user.teamId) {
      return { success: false, error: '권한이 없습니다' }
    }

    await prisma.linkView.upsert({
      where: {
        linkId_userId: {
          linkId,
          userId: session.user.id,
        },
      },
      create: {
        linkId,
        userId: session.user.id,
      },
      update: {
        viewedAt: new Date(),
      },
    })

    return { success: true, data: undefined }
  } catch (error) {
    console.error('recordLinkView error:', error)
    return { success: false, error: '조회 기록에 실패했습니다' }
  }
}

export async function unrecordLinkView(linkId: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await prisma.linkView.deleteMany({
      where: {
        linkId,
        userId: session.user.id,
      },
    })

    return { success: true, data: undefined }
  } catch (error) {
    console.error('unrecordLinkView error:', error)
    return { success: false, error: '조회 기록 삭제에 실패했습니다' }
  }
}

export async function deleteLinks(linkIds: string[]): Promise<ActionResult<{ deleted: number }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const links = await prisma.link.findMany({
      where: { id: { in: linkIds } },
    })

    const accessibleLinkIds = links
      .filter(link => 
        (link.ownerType === 'PERSONAL' && link.userId === session.user.id) ||
        (link.ownerType === 'TEAM' && link.teamId === session.user.teamId)
      )
      .map(link => link.id)

    const result = await prisma.link.deleteMany({
      where: { id: { in: accessibleLinkIds } },
    })

    revalidatePath('/links')

    return { success: true, data: { deleted: result.count } }
  } catch (error) {
    console.error('deleteLinks error:', error)
    return { success: false, error: '링크 삭제에 실패했습니다' }
  }
}
