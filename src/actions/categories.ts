'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult, CategoryWithCount } from '@/types'
import { TransactionType } from '@prisma/client'

const createCategorySchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(50),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '올바른 색상 코드를 입력해주세요'),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

export async function createCategory(
  formData: FormData
): Promise<ActionResult<CategoryWithCount>> {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const raw = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      color: formData.get('color') as string || '#3B82F6',
    }

    const parsed = createCategorySchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const existing = await prisma.category.findFirst({
      where: {
        teamId: session.user.teamId,
        name: parsed.data.name,
        type: parsed.data.type,
      },
    })

    if (existing) {
      return { success: false, error: '같은 이름의 카테고리가 이미 존재합니다' }
    }

    const category = await prisma.category.create({
      data: {
        ...parsed.data,
        teamId: session.user.teamId,
      },
      include: {
        _count: { select: { transactions: true } },
      },
    })

    revalidatePath('/categories')
    revalidatePath('/transactions')

    return { success: true, data: category }
  } catch (error) {
    console.error('createCategory error:', error)
    return { success: false, error: '카테고리 생성에 실패했습니다' }
  }
}

export async function updateCategory(
  id: string,
  formData: FormData
): Promise<ActionResult<CategoryWithCount>> {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const existing = await prisma.category.findFirst({
      where: { id, teamId: session.user.teamId },
    })

    if (!existing) {
      return { success: false, error: '카테고리를 찾을 수 없습니다' }
    }

    const raw = {
      name: formData.get('name') as string || undefined,
      color: formData.get('color') as string || undefined,
    }

    const parsed = updateCategorySchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.category.findFirst({
        where: {
          teamId: session.user.teamId,
          name: parsed.data.name,
          type: existing.type,
          id: { not: id },
        },
      })

      if (duplicate) {
        return { success: false, error: '같은 이름의 카테고리가 이미 존재합니다' }
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
      include: {
        _count: { select: { transactions: true } },
      },
    })

    revalidatePath('/categories')
    revalidatePath('/transactions')

    return { success: true, data: category }
  } catch (error) {
    console.error('updateCategory error:', error)
    return { success: false, error: '카테고리 수정에 실패했습니다' }
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const existing = await prisma.category.findFirst({
      where: { id, teamId: session.user.teamId },
      include: { _count: { select: { transactions: true } } },
    })

    if (!existing) {
      return { success: false, error: '카테고리를 찾을 수 없습니다' }
    }

    if (existing._count.transactions > 0) {
      return {
        success: false,
        error: `이 카테고리에 ${existing._count.transactions}개의 거래가 있습니다. 먼저 거래를 삭제하거나 다른 카테고리로 이동해주세요.`,
      }
    }

    await prisma.category.delete({ where: { id } })

    revalidatePath('/categories')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('deleteCategory error:', error)
    return { success: false, error: '카테고리 삭제에 실패했습니다' }
  }
}

export async function getCategories(
  type?: TransactionType
): Promise<ActionResult<CategoryWithCount[]>> {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const where: Record<string, unknown> = { teamId: session.user.teamId }
    if (type) where.type = type

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })

    return { success: true, data: categories }
  } catch (error) {
    console.error('getCategories error:', error)
    return { success: false, error: '카테고리 목록 조회에 실패했습니다' }
  }
}
