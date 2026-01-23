'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { LinkSaveSettings } from '@/types/links'

export async function getLinkSaveSettings(): Promise<ActionResult<LinkSaveSettings>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { linkSavePersonal: true, linkSaveTeam: true },
    })

    return {
      success: true,
      data: {
        savePersonal: (user as { linkSavePersonal?: boolean })?.linkSavePersonal ?? true,
        saveTeam: (user as { linkSaveTeam?: boolean })?.linkSaveTeam ?? false,
      },
    }
  } catch (error) {
    console.error('getLinkSaveSettings error:', error)
    return { success: false, error: '설정 조회에 실패했습니다' }
  }
}

export async function updateLinkSaveSettings(
  settings: LinkSaveSettings
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!settings.savePersonal && !settings.saveTeam) {
      return { success: false, error: '최소 하나의 저장 위치를 선택해주세요' }
    }

    if (settings.saveTeam && !session.user.teamId) {
      return { success: false, error: '팀에 소속되어 있지 않습니다' }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        linkSavePersonal: settings.savePersonal,
        linkSaveTeam: settings.saveTeam,
      } as Record<string, boolean>,
    })

    revalidatePath('/links')
    revalidatePath('/settings')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('updateLinkSaveSettings error:', error)
    return { success: false, error: '설정 업데이트에 실패했습니다' }
  }
}
