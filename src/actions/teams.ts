'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult, TeamWithMembers } from '@/types'
import { TransactionType, type UserRole } from '@prisma/client'

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

    const raw = {
      name: formData.get('name') as string,
      secretKey: formData.get('secretKey') as string,
    }
    const parsed = createTeamSchema.safeParse(raw)

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

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

      await tx.userTeam.updateMany({
        where: { userId: session.user.id },
        data: { isActive: false },
      })

      await tx.userTeam.create({
        data: {
          userId: session.user.id,
          teamId: newTeam.id,
          role: 'ADMIN',
          isActive: true,
        },
      })

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

    const team = await prisma.team.findUnique({
      where: { inviteCode },
    })

    if (!team) {
      return { success: false, error: '유효하지 않은 초대 코드입니다' }
    }

    const existingMembership = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: session.user.id,
          teamId: team.id,
        },
      },
    })

    if (existingMembership) {
      return { success: false, error: '이미 해당 팀에 소속되어 있습니다' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.userTeam.updateMany({
        where: { userId: session.user.id },
        data: { isActive: false },
      })

      await tx.userTeam.create({
        data: {
          userId: session.user.id,
          teamId: team.id,
          role: 'MEMBER',
          isActive: true,
        },
      })

      await tx.user.update({
        where: { id: session.user.id },
        data: { teamId: team.id, role: 'MEMBER' },
      })
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

export async function switchTeam(
  teamId: string
): Promise<ActionResult<{ teamId: string; teamName: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const membership = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: session.user.id,
          teamId,
        },
      },
      include: { team: true },
    })

    if (!membership) {
      return { success: false, error: '해당 팀의 멤버가 아닙니다' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.userTeam.updateMany({
        where: { userId: session.user.id },
        data: { isActive: false },
      })

      await tx.userTeam.update({
        where: { id: membership.id },
        data: { isActive: true },
      })

      await tx.user.update({
        where: { id: session.user.id },
        data: { teamId, role: membership.role },
      })
    })

    revalidatePath('/')

    return {
      success: true,
      data: { teamId, teamName: membership.team.name },
    }
  } catch (error) {
    console.error('switchTeam error:', error)
    return { success: false, error: '팀 전환에 실패했습니다' }
  }
}

export async function getUserTeams(): Promise<
  ActionResult<Array<{ id: string; name: string; role: UserRole }>>
> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const memberships = await prisma.userTeam.findMany({
      where: { userId: session.user.id },
      include: {
        team: { select: { id: true, name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    })

    const teams = memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      role: m.role,
    }))

    return { success: true, data: teams }
  } catch (error) {
    console.error('getUserTeams error:', error)
    return { success: false, error: '팀 목록 조회에 실패했습니다' }
  }
}

export async function leaveTeam(
  teamId: string
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const membership = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: session.user.id,
          teamId,
        },
      },
    })

    if (!membership) {
      return { success: false, error: '해당 팀의 멤버가 아닙니다' }
    }

    if (membership.role === 'ADMIN') {
      const adminCount = await prisma.userTeam.count({
        where: { teamId, role: 'ADMIN' },
      })
      if (adminCount <= 1) {
        return { success: false, error: '팀에 최소 한 명의 관리자가 필요합니다' }
      }
    }

    const totalTeams = await prisma.userTeam.count({
      where: { userId: session.user.id },
    })

    if (totalTeams <= 1) {
      return { success: false, error: '최소 한 개의 팀에 소속되어야 합니다' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.userTeam.delete({
        where: { id: membership.id },
      })

      if (membership.isActive) {
        const otherTeam = await tx.userTeam.findFirst({
          where: { userId: session.user.id },
        })

        if (otherTeam) {
          await tx.userTeam.update({
            where: { id: otherTeam.id },
            data: { isActive: true },
          })

          await tx.user.update({
            where: { id: session.user.id },
            data: { teamId: otherTeam.teamId, role: otherTeam.role },
          })
        }
      }
    })

    revalidatePath('/')
    revalidatePath('/settings')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('leaveTeam error:', error)
    return { success: false, error: '팀 탈퇴에 실패했습니다' }
  }
}

export async function deleteTeam(
  teamId: string
): Promise<ActionResult<{ nextTeamId: string | null; nextTeamName: string | null }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const membership = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: session.user.id,
          teamId,
        },
      },
    })

    if (!membership || membership.role !== 'ADMIN') {
      return { success: false, error: '관리자만 팀을 삭제할 수 있습니다' }
    }

    const nextTeam = await prisma.userTeam.findFirst({
      where: { 
        userId: session.user.id,
        teamId: { not: teamId }
      },
      include: { team: { select: { id: true, name: true } } },
      orderBy: { joinedAt: 'asc' },
    })

    await prisma.$transaction(async (tx) => {
      await tx.userTeam.deleteMany({ where: { teamId } })

      await tx.user.updateMany({
        where: { teamId },
        data: { teamId: null, role: 'MEMBER' },
      })

      if (nextTeam) {
        await tx.userTeam.update({
          where: { id: nextTeam.id },
          data: { isActive: true },
        })
        await tx.user.update({
          where: { id: session.user.id },
          data: { teamId: nextTeam.teamId, role: nextTeam.role },
        })
      }

      await tx.category.deleteMany({ where: { teamId } })
      await tx.transaction.deleteMany({ where: { teamId } })
      await tx.teamTemplate.deleteMany({ where: { teamId } })
      await tx.linkFolder.deleteMany({ where: { teamId } })
      await tx.link.deleteMany({ where: { teamId } })

      await tx.team.delete({ where: { id: teamId } })
    })

    revalidatePath('/')
    revalidatePath('/settings')

    return { 
      success: true, 
      data: { 
        nextTeamId: nextTeam?.team.id || null,
        nextTeamName: nextTeam?.team.name || null
      } 
    }
  } catch (error) {
    console.error('deleteTeam error:', error)
    return { success: false, error: '팀 삭제에 실패했습니다' }
  }
}

export async function getTeam(): Promise<ActionResult<TeamWithMembers>> {
  try {
    const session = await auth()
    const teamId = session?.user?.activeTeamId || session?.user?.teamId
    if (!teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: { memberships: true, transactions: true },
        },
      },
    })

    if (!team) {
      return { success: false, error: '팀을 찾을 수 없습니다' }
    }

    const transformedTeam = {
      ...team,
      users: team.memberships.map((m) => ({
        ...m.user,
        role: m.role,
      })),
      _count: {
        users: team._count.memberships,
        transactions: team._count.transactions,
      },
    }

    return { success: true, data: transformedTeam as TeamWithMembers }
  } catch (error) {
    console.error('getTeam error:', error)
    return { success: false, error: '팀 정보 조회에 실패했습니다' }
  }
}

export async function regenerateInviteCode(): Promise<ActionResult<string>> {
  try {
    const session = await auth()
    const teamId = session?.user?.activeTeamId || session?.user?.teamId
    if (!teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const team = await prisma.team.update({
      where: { id: teamId },
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

export async function getEnabledTemplateCategories(): Promise<ActionResult<string[]>> {
  try {
    const session = await auth()
    const teamId = session?.user?.activeTeamId || session?.user?.teamId
    if (!teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { enabledTemplateCategories: true },
    })

    const enabled = team?.enabledTemplateCategories ?? ['sales']

    return { success: true, data: enabled }
  } catch (error) {
    console.error('getEnabledTemplateCategories error:', error)
    return { success: false, error: '템플릿 조회에 실패했습니다' }
  }
}

export async function toggleTemplateCategory(
  categoryKey: string,
  enabled: boolean
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    const teamId = session?.user?.activeTeamId || session?.user?.teamId
    if (!session?.user?.id || !teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (categoryKey === 'sales') {
      return { success: false, error: '매출관리는 비활성화할 수 없습니다' }
    }

    const membership = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: session.user.id,
          teamId,
        },
      },
    })

    if (membership?.role !== 'ADMIN') {
      return { success: false, error: '관리자만 템플릿을 변경할 수 있습니다' }
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { enabledTemplateCategories: true },
    })

    let categories = team?.enabledTemplateCategories ?? ['sales']

    if (enabled && !categories.includes(categoryKey)) {
      categories = [...categories, categoryKey]
    } else if (!enabled) {
      categories = categories.filter((c: string) => c !== categoryKey)
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { enabledTemplateCategories: categories },
    })

    revalidatePath('/settings/templates')
    revalidatePath('/')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('toggleTemplateCategory error:', error)
    return { success: false, error: '템플릿 변경에 실패했습니다' }
  }
}

export async function removeMember(
  memberId: string
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    const teamId = session?.user?.activeTeamId || session?.user?.teamId
    if (!session?.user?.id || !teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const currentMembership = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: session.user.id,
          teamId,
        },
      },
    })

    if (currentMembership?.role !== 'ADMIN') {
      return { success: false, error: '관리자만 멤버를 삭제할 수 있습니다' }
    }

    const targetMembership = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: memberId,
          teamId,
        },
      },
    })

    if (!targetMembership) {
      return { success: false, error: '해당 멤버를 찾을 수 없습니다' }
    }

    if (targetMembership.role === 'ADMIN') {
      return { success: false, error: '관리자는 삭제할 수 없습니다' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.userTeam.delete({
        where: { id: targetMembership.id },
      })

      const remainingTeams = await tx.userTeam.count({
        where: { userId: memberId },
      })

      if (remainingTeams === 0) {
        await tx.user.update({
          where: { id: memberId },
          data: { teamId: null, role: 'MEMBER' },
        })
      } else if (targetMembership.isActive) {
        const nextTeam = await tx.userTeam.findFirst({
          where: { userId: memberId },
        })
        if (nextTeam) {
          await tx.userTeam.update({
            where: { id: nextTeam.id },
            data: { isActive: true },
          })
          await tx.user.update({
            where: { id: memberId },
            data: { teamId: nextTeam.teamId, role: nextTeam.role },
          })
        }
      }
    })

    revalidatePath('/settings')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('removeMember error:', error)
    return { success: false, error: '멤버 삭제에 실패했습니다' }
  }
}
