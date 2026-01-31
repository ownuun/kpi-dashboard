import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import type { UserRole } from '@prisma/client'

type TeamInfo = { id: string; name: string; role: UserRole }

const { handlers, auth: uncachedAuth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async signIn({ user }) {
      return !!user.email
    },

    async jwt({ token, user, trigger, session }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, teamId: true },
        })

        if (dbUser) {
          token.userId = dbUser.id

          const userTeams = await prisma.userTeam.findMany({
            where: { userId: dbUser.id },
            include: {
              team: { select: { id: true, name: true } },
            },
            orderBy: { joinedAt: 'asc' },
          })

          token.teams = userTeams.map((ut): TeamInfo => ({
            id: ut.team.id,
            name: ut.team.name,
            role: ut.role,
          }))

          if (userTeams.length > 0) {
            const activeTeam = userTeams.find((ut) => ut.isActive) || userTeams[0]
            token.activeTeamId = activeTeam.team.id
          } else {
            token.activeTeamId = dbUser.teamId
          }

          token.teamId = token.activeTeamId

          if (!dbUser.teamId && userTeams.length === 0) {
            try {
              const cookieStore = await cookies()
              const pendingInviteCode = cookieStore.get('pending_invite_code')?.value

              if (pendingInviteCode) {
                const team = await prisma.team.findUnique({
                  where: { inviteCode: pendingInviteCode },
                })

                if (team) {
                  await prisma.userTeam.create({
                    data: {
                      userId: dbUser.id,
                      teamId: team.id,
                      role: 'MEMBER',
                      isActive: true,
                    },
                  })

                  await prisma.user.update({
                    where: { id: dbUser.id },
                    data: { teamId: team.id },
                  })

                  token.activeTeamId = team.id
                  token.teamId = team.id
                  token.teams = [{ id: team.id, name: team.name, role: 'MEMBER' as const }]
                  cookieStore.delete('pending_invite_code')
                }
              }
            } catch (error) {
              console.error('Invite code processing error:', error)
            }
          }
        }
      }

      if (trigger === 'update') {
        if (session?.activeTeamId) {
          token.activeTeamId = session.activeTeamId
          token.teamId = session.activeTeamId
        }
        if (session?.teamId && !session?.activeTeamId) {
          token.teamId = session.teamId
          token.activeTeamId = session.teamId
        }
        if (session?.teams) {
          token.teams = session.teams
        }
      }

      return token
    },

    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
          activeTeamId: token.activeTeamId as string | null,
          teamId: token.teamId as string | null,
          teams: (token.teams as TeamInfo[]) || [],
        },
      }
    },
  },
})

export const auth = uncachedAuth
export { handlers, signIn, signOut }

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      activeTeamId: string | null
      teamId: string | null
      teams: TeamInfo[]
      email: string
      name?: string | null
      image?: string | null
    }
  }

  interface JWT {
    userId?: string
    activeTeamId?: string | null
    teamId?: string | null
    teams?: TeamInfo[]
  }
}
