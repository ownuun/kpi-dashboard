'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult, TeamWithMembers } from '@/types'
import { TransactionType } from '@prisma/client'

const createTeamSchema = z.object({
  name: z.string().min(2, '팀 이름은 2자 이상이어야 합니다').max(50),
  secretKey: z.string().min(1, '시크릿 키를 입력해주세요'),
})

const DEFAULT_INCOME_CATEGORIES = [
  { name: '외주', color: '#3B82F6' },
  { name: '컨설팅', color: '#8B5CF6' },
  { name: '강의', color: '#10B981' },
  { name: '기타 수입', color: '#6B7280' },
]

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: '인건비', color: '#EF4444' },
  { name: '운영비', color: '#F97316' },
  { name: '마케팅', color: '#EC4899' },
  { name: '장비/소프트웨어', color: '#14B8A6' },
  { name: '기타 지출', color: '#6B7280' },
]

async function seedTeamCategories(teamId: string) {
  const incomeCategories = DEFAULT_INCOME_CATEGORIES.map((cat) => ({
    ...cat,
    type: TransactionType.INCOME,
    teamId,
  }))

  const expenseCategories = DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
    ...cat,
    type: TransactionType.EXPENSE,
    teamId,
  }))

  await prisma.category.createMany({
    data: [...incomeCategories, ...expenseCategories],
    skipDuplicates: true,
  })
}

async function seedDefaultTemplates(teamId: string) {
  const salesCategory = await prisma.templateCategory.findUnique({
    where: { key: 'sales' },
  })

  if (!salesCategory) return

  const defaultTemplates = await prisma.template.findMany({
    where: { isDefault: true },
  })

  if (defaultTemplates.length === 0) return

  await prisma.teamTemplate.createMany({
    data: defaultTemplates.map((template) => ({
      teamId,
      templateId: template.id,
    })),
    skipDuplicates: true,
  })
}

export async function createTeam(
  formData: FormData
): Promise<ActionResult<{ teamId: string; inviteCode: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    })

    if (user?.teamId) {
      return { success: false, error: '이미 팀에 소속되어 있습니다' }
    }

    const raw = {
      name: formData.get('name') as string,
      secretKey: formData.get('secretKey') as string,
    }
    const parsed = createTeamSchema.safeParse(raw)

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    // 시크릿 키 검증
    const validSecretKey = process.env.TEAM_CREATE_SECRET
    if (!validSecretKey || parsed.data.secretKey !== validSecretKey) {
      return { success: false, error: '유효하지 않은 시크릿 키입니다' }
    }

    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name: parsed.data.name,
          creatorId: session.user.id,
        },
      })

      // 팀 생성자는 ADMIN으로 설정
      await tx.user.update({
        where: { id: session.user.id },
        data: { teamId: newTeam.id, role: 'ADMIN' },
      })

      return newTeam
    })

    await seedTeamCategories(team.id)
    await seedDefaultTemplates(team.id)

    return {
      success: true,
      data: { teamId: team.id, inviteCode: team.inviteCode },
    }
  } catch (error) {
    console.error('createTeam error:', error)
    return { success: false, error: '팀 생성에 실패했습니다' }
  }
}

export async function joinTeam(
  inviteCode: string
): Promise<ActionResult<{ teamId: string; teamName: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    })

    if (user?.teamId) {
      return { success: false, error: '이미 팀에 소속되어 있습니다' }
    }

    const team = await prisma.team.findUnique({
      where: { inviteCode },
    })

    if (!team) {
      return { success: false, error: '유효하지 않은 초대 코드입니다' }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { teamId: team.id, role: 'MEMBER' },
    })

    return {
      success: true,
      data: { teamId: team.id, teamName: team.name },
    }
  } catch (error) {
    console.error('joinTeam error:', error)
    return { success: false, error: '팀 합류에 실패했습니다' }
  }
}

export async function getTeam(): Promise<ActionResult<TeamWithMembers>> {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const team = await prisma.team.findUnique({
      where: { id: session.user.teamId },
      include: {
        users: {
          select: { id: true, name: true, email: true, image: true, role: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { users: true, transactions: true },
        },
      },
    })

    if (!team) {
      return { success: false, error: '팀을 찾을 수 없습니다' }
    }

    return { success: true, data: team }
  } catch (error) {
    console.error('getTeam error:', error)
    return { success: false, error: '팀 정보 조회에 실패했습니다' }
  }
}

export async function regenerateInviteCode(): Promise<ActionResult<string>> {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const team = await prisma.team.update({
      where: { id: session.user.teamId },
      data: { inviteCode: crypto.randomUUID().slice(0, 8).toUpperCase() },
    })

    revalidatePath('/settings')

    return { success: true, data: team.inviteCode }
  } catch (error) {
    console.error('regenerateInviteCode error:', error)
    return { success: false, error: '초대 코드 재생성에 실패했습니다' }
  }
}

export async function joinTeamAndUpdateSession(
  inviteCode: string
): Promise<ActionResult<{ teamId: string; teamName: string }>> {
  const result = await joinTeam(inviteCode)
  
  if (result.success) {
    revalidatePath('/')
  }
  
  return result
}

export async function removeMember(
  memberId: string
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session?.user?.id || !session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true },
    })

    if (currentUser?.role !== 'ADMIN') {
      return { success: false, error: '관리자만 멤버를 삭제할 수 있습니다' }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: memberId },
      select: { role: true, teamId: true },
    })

    if (!targetUser || targetUser.teamId !== currentUser.teamId) {
      return { success: false, error: '해당 멤버를 찾을 수 없습니다' }
    }

    if (targetUser.role === 'ADMIN') {
      return { success: false, error: '관리자는 삭제할 수 없습니다' }
    }

    await prisma.user.update({
      where: { id: memberId },
      data: { teamId: null, role: 'MEMBER' },
    })

    revalidatePath('/settings')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('removeMember error:', error)
    return { success: false, error: '멤버 삭제에 실패했습니다' }
  }
}
