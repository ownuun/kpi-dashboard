import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { joinTeamAndUpdateSession } from '@/actions/teams'

interface JoinPageProps {
  params: Promise<{ inviteCode: string }>
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { inviteCode } = await params
  const session = await auth()

  const team = await prisma.team.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
    select: { id: true, name: true },
  })

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600">유효하지 않은 초대</CardTitle>
            <CardDescription>
              초대 코드가 유효하지 않거나 만료되었습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/login">로그인 페이지로 이동</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (session?.user?.teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">이미 팀에 소속되어 있습니다</CardTitle>
            <CardDescription>
              다른 팀에 합류하려면 먼저 현재 팀에서 나가야 합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/">대시보드로 이동</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">팀 초대</CardTitle>
            <CardDescription>
              <span className="font-semibold text-foreground">{team.name}</span> 팀에
              초대되었습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={async () => {
                'use server'
                const result = await joinTeamAndUpdateSession(inviteCode.toUpperCase())
                if (result.success) {
                  redirect('/')
                }
              }}
            >
              <Button type="submit" className="w-full" size="lg">
                팀 합류하기
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">팀 초대</CardTitle>
          <CardDescription>
            <span className="font-semibold text-foreground">{team.name}</span> 팀에
            초대되었습니다. 로그인하면 자동으로 팀에 합류됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              'use server'
              const cookieStore = await cookies()
              cookieStore.set('pending_invite_code', inviteCode.toUpperCase(), {
                maxAge: 3600,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
              })
              await signIn('google', { redirectTo: '/' })
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google로 로그인하고 합류하기
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
