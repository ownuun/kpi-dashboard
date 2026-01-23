'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult } from '@/types'
import type { LinkTagBasic, LinkTagWithCount, LinkOwnerType } from '@/types/links'

const createTagSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '올바른 색상 코드를 입력해주세요'),
  ownerType: z.enum(['PERSONAL', 'TEAM']),
})

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

export async function getTags(
  ownerType: LinkOwnerType
): Promise<ActionResult<LinkTagWithCount[]>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const whereClause =
      ownerType === 'PERSONAL'
        ? { userId: session.user.id, ownerType: 'PERSONAL' as const }
        : session.user.teamId
          ? { teamId: session.user.teamId, ownerType: 'TEAM' as const }
          : null

    if (!whereClause) {
      return { success: false, error: '팀에 소속되어 있지 않습니다' }
    }

    const tags = await prisma.linkTag.findMany({
      where: whereClause,
      include: {
        _count: { select: { links: true } },
      },
      orderBy: { name: 'asc' },
    })

    return { success: true, data: tags as LinkTagWithCount[] }
  } catch (error) {
    console.error('getTags error:', error)
    return { success: false, error: '태그 목록 조회에 실패했습니다' }
  }
}

export async function getAllTags(): Promise<
  ActionResult<{ personal: LinkTagWithCount[]; team: LinkTagWithCount[] }>
> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const [personalTags, teamTags] = await Promise.all([
      prisma.linkTag.findMany({
        where: { userId: session.user.id, ownerType: 'PERSONAL' },
        include: { _count: { select: { links: true } } },
        orderBy: { name: 'asc' },
      }),
      session.user.teamId
        ? prisma.linkTag.findMany({
            where: { teamId: session.user.teamId, ownerType: 'TEAM' },
            include: { _count: { select: { links: true } } },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([]),
    ])

    return {
      success: true,
      data: {
        personal: personalTags as LinkTagWithCount[],
        team: teamTags as LinkTagWithCount[],
      },
    }
  } catch (error) {
    console.error('getAllTags error:', error)
    return { success: false, error: '태그 목록 조회에 실패했습니다' }
  }
}

export async function createTag(
  formData: FormData
): Promise<ActionResult<LinkTagBasic>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const raw = {
      name: formData.get('name') as string,
      color: (formData.get('color') as string) || '#3B82F6',
      ownerType: formData.get('ownerType') as string,
    }

    const parsed = createTagSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { name, color, ownerType } = parsed.data

    if (ownerType === 'TEAM' && !session.user.teamId) {
      return { success: false, error: '팀에 소속되어 있지 않습니다' }
    }

    const existingWhere =
      ownerType === 'PERSONAL'
        ? { userId: session.user.id, name, ownerType: 'PERSONAL' as const }
        : { teamId: session.user.teamId!, name, ownerType: 'TEAM' as const }

    const existing = await prisma.linkTag.findFirst({ where: existingWhere })
    if (existing) {
      return { success: false, error: '같은 이름의 태그가 이미 존재합니다' }
    }

    const createData =
      ownerType === 'PERSONAL'
        ? { name, color, ownerType: 'PERSONAL' as const, userId: session.user.id }
        : { name, color, ownerType: 'TEAM' as const, teamId: session.user.teamId! }

    const tag = await prisma.linkTag.create({ data: createData })

    revalidatePath('/links')
    revalidatePath('/links/tags')

    return { success: true, data: tag as LinkTagBasic }
  } catch (error) {
    console.error('createTag error:', error)
    return { success: false, error: '태그 생성에 실패했습니다' }
  }
}

export async function updateTag(
  id: string,
  formData: FormData
): Promise<ActionResult<LinkTagBasic>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const existing = await prisma.linkTag.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: '태그를 찾을 수 없습니다' }
    }

    const isOwner =
      (existing.ownerType === 'PERSONAL' && existing.userId === session.user.id) ||
      (existing.ownerType === 'TEAM' && existing.teamId === session.user.teamId)

    if (!isOwner) {
      return { success: false, error: '권한이 없습니다' }
    }

    const raw = {
      name: (formData.get('name') as string) || undefined,
      color: (formData.get('color') as string) || undefined,
    }

    const parsed = updateTagSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicateWhere =
        existing.ownerType === 'PERSONAL'
          ? {
              userId: session.user.id,
              name: parsed.data.name,
              ownerType: 'PERSONAL' as const,
              id: { not: id },
            }
          : {
              teamId: session.user.teamId!,
              name: parsed.data.name,
              ownerType: 'TEAM' as const,
              id: { not: id },
            }

      const duplicate = await prisma.linkTag.findFirst({ where: duplicateWhere })
      if (duplicate) {
        return { success: false, error: '같은 이름의 태그가 이미 존재합니다' }
      }
    }

    const tag = await prisma.linkTag.update({
      where: { id },
      data: parsed.data,
    })

    revalidatePath('/links')
    revalidatePath('/links/tags')

    return { success: true, data: tag as LinkTagBasic }
  } catch (error) {
    console.error('updateTag error:', error)
    return { success: false, error: '태그 수정에 실패했습니다' }
  }
}

export async function deleteTag(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const existing = await prisma.linkTag.findUnique({
      where: { id },
      include: { _count: { select: { links: true } } },
    })

    if (!existing) {
      return { success: false, error: '태그를 찾을 수 없습니다' }
    }

    const isOwner =
      (existing.ownerType === 'PERSONAL' && existing.userId === session.user.id) ||
      (existing.ownerType === 'TEAM' && existing.teamId === session.user.teamId)

    if (!isOwner) {
      return { success: false, error: '권한이 없습니다' }
    }

    await prisma.linkTag.delete({ where: { id } })

    revalidatePath('/links')
    revalidatePath('/links/tags')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('deleteTag error:', error)
    return { success: false, error: '태그 삭제에 실패했습니다' }
  }
}
