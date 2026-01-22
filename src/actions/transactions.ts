'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  ActionResult,
  TransactionWithCategory,
  PaginatedTransactions,
  TransactionFilters,
} from '@/types'

const createTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().min(1, '금액은 1원 이상이어야 합니다'),
  description: z.string().optional(),
  date: z.coerce.date(),
  categoryId: z.string().min(1, '카테고리를 선택해주세요'),
})

const updateTransactionSchema = createTransactionSchema.partial()

export async function createTransaction(
  formData: FormData
): Promise<ActionResult<TransactionWithCategory>> {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const raw = {
      type: formData.get('type') as string,
      amount: Number(formData.get('amount')),
      description: formData.get('description') as string || undefined,
      date: formData.get('date') as string,
      categoryId: formData.get('categoryId') as string,
    }

    const parsed = createTransactionSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { type, amount, description, date, categoryId } = parsed.data

    const category = await prisma.category.findFirst({
      where: { id: categoryId, teamId: session.user.teamId },
    })

    if (!category) {
      return { success: false, error: '유효하지 않은 카테고리입니다' }
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount,
        description,
        date,
        categoryId,
        teamId: session.user.teamId,
        createdById: session.user.id,
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        createdBy: { select: { name: true } },
      },
    })

    revalidatePath('/')
    revalidatePath('/transactions')

    return { success: true, data: transaction }
  } catch (error) {
    console.error('createTransaction error:', error)
    return { success: false, error: '거래 생성에 실패했습니다' }
  }
}

export async function updateTransaction(
  id: string,
  formData: FormData
): Promise<ActionResult<TransactionWithCategory>> {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const existing = await prisma.transaction.findFirst({
      where: { id, teamId: session.user.teamId },
    })

    if (!existing) {
      return { success: false, error: '거래를 찾을 수 없습니다' }
    }

    const raw = {
      type: formData.get('type') as string || undefined,
      amount: formData.get('amount') ? Number(formData.get('amount')) : undefined,
      description: formData.get('description') as string || undefined,
      date: formData.get('date') as string || undefined,
      categoryId: formData.get('categoryId') as string || undefined,
    }

    const parsed = updateTransactionSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: parsed.data,
      include: {
        category: { select: { id: true, name: true, color: true } },
        createdBy: { select: { name: true } },
      },
    })

    revalidatePath('/')
    revalidatePath('/transactions')

    return { success: true, data: transaction }
  } catch (error) {
    console.error('updateTransaction error:', error)
    return { success: false, error: '거래 수정에 실패했습니다' }
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const existing = await prisma.transaction.findFirst({
      where: { id, teamId: session.user.teamId },
    })

    if (!existing) {
      return { success: false, error: '거래를 찾을 수 없습니다' }
    }

    await prisma.transaction.delete({ where: { id } })

    revalidatePath('/')
    revalidatePath('/transactions')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('deleteTransaction error:', error)
    return { success: false, error: '거래 삭제에 실패했습니다' }
  }
}

export async function getTransactions(
  filters: TransactionFilters = {},
  page = 1,
  perPage = 20
): Promise<ActionResult<PaginatedTransactions>> {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const where: Record<string, unknown> = { teamId: session.user.teamId }

    if (filters.startDate || filters.endDate) {
      where.date = {}
      if (filters.startDate) (where.date as Record<string, unknown>).gte = filters.startDate
      if (filters.endDate) (where.date as Record<string, unknown>).lte = filters.endDate
    }

    if (filters.type) {
      where.type = filters.type
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId
    }

    const skip = (page - 1) * perPage

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.transaction.count({ where }),
    ])

    return {
      success: true,
      data: {
        transactions,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    }
  } catch (error) {
    console.error('getTransactions error:', error)
    return { success: false, error: '거래 목록 조회에 실패했습니다' }
  }
}
