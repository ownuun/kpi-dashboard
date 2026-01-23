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
} from '@/types/links'

const createLinkSchema = z.object({
  url: z.string().url('올바른 URL을 입력해주세요'),
  title: z.string().min(1, '제목을 입력해주세요').max(500),
  description: z.string().max(2000).optional(),
  favicon: z.string().url().optional().nullable(),
  rating: z.number().min(0).max(5).optional(),
  ownerType: z.enum(['PERSONAL', 'TEAM']),
  tagIds: z.array(z.string()),
})

const updateLinkSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  rating: z.number().min(0).max(5).optional(),
  tagIds: z.array(z.string()).optional(),
})

function transformLink(link: {
  id: string
  url: string
  title: string
  description: string | null
  favicon: string | null
  rating: number
  ownerType: string
  createdBy: { id: string; name: string | null; image: string | null }
  tags: Array<{ tag: { id: string; name: string; color: string; ownerType: string } }>
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
    createdBy: link.createdBy,
    tags: link.tags.map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      color: t.tag.color,
      ownerType: t.tag.ownerType as LinkOwnerType,
    })),
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

    if (filters.ownerType === 'PERSONAL') {
      where.ownerType = 'PERSONAL'
      where.userId = session.user.id
    } else if (filters.ownerType === 'TEAM') {
      if (!session.user.teamId) {
        return { success: false, error: '팀에 소속되어 있지 않습니다' }
      }
      where.ownerType = 'TEAM'
      where.teamId = session.user.teamId
    } else {
      where.OR = [
        { ownerType: 'PERSONAL', userId: session.user.id },
        ...(session.user.teamId
          ? [{ ownerType: 'TEAM', teamId: session.user.teamId }]
          : []),
      ]
    }

    if (filters.tagIds && filters.tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: { in: filters.tagIds },
        },
      }
    }

    if (filters.rating !== undefined && filters.rating > 0) {
      where.rating = { gte: filters.rating }
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { url: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
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
          createdBy: {
            select: { id: true, name: true, image: true },
          },
          tags: {
            include: {
              tag: {
                select: { id: true, name: true, color: true, ownerType: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
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
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true, color: true, ownerType: true },
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

    const { url, title, description, favicon, rating, ownerType, tagIds } = parsed.data

    if (ownerType === 'TEAM' && !session.user.teamId) {
      return { success: false, error: '팀에 소속되어 있지 않습니다' }
    }

    const createData = {
      url,
      title,
      description,
      favicon,
      rating: rating ?? 0,
      ownerType: ownerType as 'PERSONAL' | 'TEAM',
      createdById: session.user.id,
      ...(ownerType === 'PERSONAL'
        ? { userId: session.user.id }
        : { teamId: session.user.teamId! }),
      tags: tagIds.length > 0
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    }

    const link = await prisma.link.create({
      data: createData,
      include: {
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true, color: true, ownerType: true },
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

    const { tagIds, ...updateData } = parsed.data

    const link = await prisma.link.update({
      where: { id },
      data: {
        ...updateData,
        ...(tagIds !== undefined
          ? {
              tags: {
                deleteMany: {},
                create: tagIds.map((tagId) => ({ tagId })),
              },
            }
          : {}),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true, color: true, ownerType: true },
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
