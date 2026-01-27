'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult } from '@/types'
import type {
  LinkFolderBasic,
  LinkFolderWithChildren,
  LinkFolderTree,
  CreateFolderInput,
  UpdateFolderInput,
} from '@/types/links'

const createFolderSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(100),
  icon: z.string().max(50).optional(),
  parentId: z.string().optional().nullable(),
  ownerType: z.enum(['PERSONAL', 'TEAM']),
})

const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(50).optional().nullable(),
})

// 폴더 트리 조회 (개인 + 팀)
export async function getFolderTree(): Promise<ActionResult<LinkFolderTree>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const includeChildren = {
      children: {
        include: {
          children: {
            include: {
              children: true,
              _count: { select: { links: true } },
            },
            orderBy: { sortOrder: 'asc' as const },
          },
          _count: { select: { links: true } },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
      _count: { select: { links: true } },
    }

    const [personalFolders, teamFolders] = await Promise.all([
      prisma.linkFolder.findMany({
        where: {
          userId: session.user.id,
          ownerType: 'PERSONAL',
          parentId: null,
        },
        include: includeChildren,
        orderBy: { sortOrder: 'asc' },
      }),
      session.user.teamId
        ? prisma.linkFolder.findMany({
            where: {
              teamId: session.user.teamId,
              ownerType: 'TEAM',
              parentId: null,
            },
            include: includeChildren,
            orderBy: { sortOrder: 'asc' },
          })
        : Promise.resolve([]),
    ])

    return {
      success: true,
      data: {
        personal: personalFolders as LinkFolderWithChildren[],
        team: teamFolders as LinkFolderWithChildren[],
        hasTeam: !!session.user.teamId,
      },
    }
  } catch (error) {
    console.error('getFolderTree error:', error)
    return { success: false, error: '폴더 목록 조회에 실패했습니다' }
  }
}

// 폴더 목록 조회 (flat)
export async function getFolders(
  ownerType: 'PERSONAL' | 'TEAM'
): Promise<ActionResult<LinkFolderBasic[]>> {
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

    const folders = await prisma.linkFolder.findMany({
      where: whereClause,
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    })

    return { success: true, data: folders as LinkFolderBasic[] }
  } catch (error) {
    console.error('getFolders error:', error)
    return { success: false, error: '폴더 목록 조회에 실패했습니다' }
  }
}

// 폴더 생성
export async function createFolder(
  input: CreateFolderInput
): Promise<ActionResult<LinkFolderBasic>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const parsed = createFolderSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { name, icon, parentId, ownerType } = parsed.data

    if (ownerType === 'TEAM' && !session.user.teamId) {
      return { success: false, error: '팀에 소속되어 있지 않습니다' }
    }

    // 중복 체크
    const existingWhere =
      ownerType === 'PERSONAL'
        ? {
            userId: session.user.id,
            parentId: parentId || null,
            name,
            ownerType: 'PERSONAL' as const,
          }
        : {
            teamId: session.user.teamId!,
            parentId: parentId || null,
            name,
            ownerType: 'TEAM' as const,
          }

    const existing = await prisma.linkFolder.findFirst({ where: existingWhere })
    if (existing) {
      return { success: false, error: '같은 이름의 폴더가 이미 존재합니다' }
    }

    const folderWhereClause =
      ownerType === 'PERSONAL'
        ? { userId: session.user.id, parentId: parentId || null, ownerType: 'PERSONAL' as const }
        : { teamId: session.user.teamId!, parentId: parentId || null, ownerType: 'TEAM' as const }

    await prisma.linkFolder.updateMany({
      where: folderWhereClause,
      data: { sortOrder: { increment: 1 } },
    })

    const createData = {
      name,
      icon,
      ownerType: ownerType as 'PERSONAL' | 'TEAM',
      parentId: parentId || null,
      sortOrder: 0,
      ...(ownerType === 'PERSONAL'
        ? { userId: session.user.id }
        : { teamId: session.user.teamId! }),
    }

    const folder = await prisma.linkFolder.create({ data: createData })

    revalidatePath('/links')

    return { success: true, data: folder as LinkFolderBasic }
  } catch (error) {
    console.error('createFolder error:', error)
    return { success: false, error: '폴더 생성에 실패했습니다' }
  }
}

// 폴더 수정
export async function updateFolder(
  id: string,
  input: UpdateFolderInput
): Promise<ActionResult<LinkFolderBasic>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const existing = await prisma.linkFolder.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: '폴더를 찾을 수 없습니다' }
    }

    const isOwner =
      (existing.ownerType === 'PERSONAL' && existing.userId === session.user.id) ||
      (existing.ownerType === 'TEAM' && existing.teamId === session.user.teamId)

    if (!isOwner) {
      return { success: false, error: '권한이 없습니다' }
    }

    const parsed = updateFolderSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    // 이름 변경 시 중복 체크
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicateWhere =
        existing.ownerType === 'PERSONAL'
          ? {
              userId: session.user.id,
              parentId: existing.parentId,
              name: parsed.data.name,
              ownerType: 'PERSONAL' as const,
              id: { not: id },
            }
          : {
              teamId: session.user.teamId!,
              parentId: existing.parentId,
              name: parsed.data.name,
              ownerType: 'TEAM' as const,
              id: { not: id },
            }

      const duplicate = await prisma.linkFolder.findFirst({ where: duplicateWhere })
      if (duplicate) {
        return { success: false, error: '같은 이름의 폴더가 이미 존재합니다' }
      }
    }

    const folder = await prisma.linkFolder.update({
      where: { id },
      data: parsed.data,
    })

    revalidatePath('/links')

    return { success: true, data: folder as LinkFolderBasic }
  } catch (error) {
    console.error('updateFolder error:', error)
    return { success: false, error: '폴더 수정에 실패했습니다' }
  }
}

// 폴더 삭제
export async function deleteFolder(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const existing = await prisma.linkFolder.findUnique({
      where: { id },
      include: {
        _count: { select: { links: true, children: true } },
      },
    })

    if (!existing) {
      return { success: false, error: '폴더를 찾을 수 없습니다' }
    }

    const isOwner =
      (existing.ownerType === 'PERSONAL' && existing.userId === session.user.id) ||
      (existing.ownerType === 'TEAM' && existing.teamId === session.user.teamId)

    if (!isOwner) {
      return { success: false, error: '권한이 없습니다' }
    }

    // 하위 폴더나 링크가 있으면 경고
    if (existing._count.children > 0 || existing._count.links > 0) {
      const message = []
      if (existing._count.children > 0) message.push(`하위 폴더 ${existing._count.children}개`)
      if (existing._count.links > 0) message.push(`링크 ${existing._count.links}개`)
      // Cascade로 삭제되므로 경고만 (확인은 UI에서)
    }

    await prisma.linkFolder.delete({ where: { id } })

    revalidatePath('/links')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('deleteFolder error:', error)
    return { success: false, error: '폴더 삭제에 실패했습니다' }
  }
}

// 폴더 이동
export async function moveFolder(
  id: string,
  newParentId: string | null
): Promise<ActionResult<LinkFolderBasic>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const existing = await prisma.linkFolder.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: '폴더를 찾을 수 없습니다' }
    }

    const isOwner =
      (existing.ownerType === 'PERSONAL' && existing.userId === session.user.id) ||
      (existing.ownerType === 'TEAM' && existing.teamId === session.user.teamId)

    if (!isOwner) {
      return { success: false, error: '권한이 없습니다' }
    }

    // 순환 참조 방지
    if (newParentId) {
      let currentParentId: string | null = newParentId
      while (currentParentId) {
        if (currentParentId === id) {
          return { success: false, error: '폴더를 자기 자신의 하위로 이동할 수 없습니다' }
        }
        const parent: { parentId: string | null } | null = await prisma.linkFolder.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        })
        currentParentId = parent?.parentId ?? null
      }
    }

    const folder = await prisma.linkFolder.update({
      where: { id },
      data: { parentId: newParentId },
    })

    revalidatePath('/links')

    return { success: true, data: folder as LinkFolderBasic }
  } catch (error) {
    console.error('moveFolder error:', error)
    return { success: false, error: '폴더 이동에 실패했습니다' }
  }
}

// 폴더 순서 변경
export async function reorderFolders(
  updates: { id: string; sortOrder: number }[]
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await prisma.$transaction(
      updates.map((update) =>
        prisma.linkFolder.update({
          where: { id: update.id },
          data: { sortOrder: update.sortOrder },
        })
      )
    )

    revalidatePath('/links')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('reorderFolders error:', error)
    return { success: false, error: '폴더 순서 변경에 실패했습니다' }
  }
}
