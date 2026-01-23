import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { LinkTagWithCount } from '@/types/links'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    return NextResponse.json({
      personal: personalTags as LinkTagWithCount[],
      team: teamTags as LinkTagWithCount[],
    })
  } catch (error) {
    console.error('Extension tags fetch error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
