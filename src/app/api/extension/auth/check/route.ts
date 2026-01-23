import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ExtensionAuthCheckResponse, AIProvider } from '@/types/links'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json<ExtensionAuthCheckResponse>({
        authenticated: false,
        hasAiApiKey: false,
        aiAutoTagEnabled: false,
        settings: { savePersonal: true, saveTeam: false },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        aiProvider: true,
        aiApiKey: true,
        aiAutoTagEnabled: true,
        linkSavePersonal: true,
        linkSaveTeam: true,
        teamId: true,
      },
    })

    const typedUser = user as {
      aiProvider: string | null
      aiApiKey: string | null
      aiAutoTagEnabled: boolean
      linkSavePersonal: boolean
      linkSaveTeam: boolean
      teamId: string | null
    } | null

    return NextResponse.json<ExtensionAuthCheckResponse>({
      authenticated: true,
      userId: session.user.id,
      teamId: typedUser?.teamId ?? null,
      hasAiApiKey: !!typedUser?.aiApiKey,
      aiProvider: (typedUser?.aiProvider as AIProvider) ?? null,
      aiAutoTagEnabled: typedUser?.aiAutoTagEnabled ?? true,
      settings: {
        savePersonal: typedUser?.linkSavePersonal ?? true,
        saveTeam: typedUser?.linkSaveTeam ?? false,
      },
    })
  } catch (error) {
    console.error('Extension auth check error:', error)
    return NextResponse.json<ExtensionAuthCheckResponse>(
      {
        authenticated: false,
        hasAiApiKey: false,
        aiAutoTagEnabled: false,
        settings: { savePersonal: true, saveTeam: false },
      },
      { status: 500 }
    )
  }
}
