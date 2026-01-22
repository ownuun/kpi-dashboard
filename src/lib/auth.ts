import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      if (!user.email) return false

      try {
        const cookieStore = await cookies()
        const pendingInviteCode = cookieStore.get('pending_invite_code')?.value

        if (pendingInviteCode) {
          const team = await prisma.team.findUnique({
            where: { inviteCode: pendingInviteCode },
          })

          if (team) {
            await prisma.user.upsert({
              where: { email: user.email },
              update: { teamId: team.id },
              create: {
                email: user.email,
                name: user.name,
                image: user.image,
                teamId: team.id,
              },
            })

            cookieStore.delete('pending_invite_code')
          }
        }

        return true
      } catch (error) {
        console.error('Sign in error:', error)
        return true
      }
    },

    async jwt({ token, user, trigger, session }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, teamId: true, name: true, image: true },
        })

        if (dbUser) {
          token.userId = dbUser.id
          token.teamId = dbUser.teamId
        }
      }

      if (trigger === 'update' && session?.teamId) {
        token.teamId = session.teamId
      }

      return token
    },

    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
          teamId: token.teamId as string | null,
        },
      }
    },
  },
})

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      teamId: string | null
      email: string
      name?: string | null
      image?: string | null
    }
  }

  interface JWT {
    userId?: string
    teamId?: string | null
  }
}
