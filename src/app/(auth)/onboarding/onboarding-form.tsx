'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createTeam, joinTeam } from '@/actions/teams'

interface OnboardingFormProps {
  userName?: string | null
  hasExistingTeam?: boolean
}

export function OnboardingForm({ userName, hasExistingTeam }: OnboardingFormProps) {
  const router = useRouter()
  const { update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) {
      toast.error('팀 이름을 입력해주세요')
      return
    }
    if (!secretKey.trim()) {
      toast.error('시크릿 키를 입력해주세요')
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.set('name', teamName)
      formData.set('secretKey', secretKey)
      const result = await createTeam(formData)

      if (result.success) {
        await update({ teamId: result.data.teamId })
        toast.success('팀이 생성되었습니다!')
        router.push('/')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) {
      toast.error('초대 코드를 입력해주세요')
      return
    }

    setIsLoading(true)
    try {
      const result = await joinTeam(inviteCode.trim().toUpperCase())

      if (result.success) {
        await update({ teamId: result.data.teamId })
        toast.success(`${result.data.teamName} 팀에 합류했습니다!`)
        router.push('/')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          {hasExistingTeam ? '팀 추가' : `환영합니다${userName ? `, ${userName}님` : ''}!`}
        </CardTitle>
        <CardDescription>
          새 팀을 만들거나, 초대 코드로 기존 팀에 합류하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">새 팀 만들기</TabsTrigger>
            <TabsTrigger value="join">팀 합류하기</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">팀 이름</Label>
                <Input
                  id="teamName"
                  placeholder="예: 우리 회사"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secretKey">시크릿 키</Label>
                <Input
                  id="secretKey"
                  type="password"
                  placeholder="발급받은 시크릿 키 입력"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  시크릿 키가 없으신가요?{' '}
                  <a
                    href="https://open.kakao.com/o/gxfRDFYh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-[#3C1E1E] bg-[#FEE500] hover:bg-[#FDD835] px-1.5 py-0.5 rounded transition-colors"
                  >
                    카카오톡 문의
                  </a>
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '생성 중...' : '팀 만들기'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="join" className="mt-4">
            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">초대 코드</Label>
                <Input
                  id="inviteCode"
                  placeholder="예: ABCD1234"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  className="uppercase"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '합류 중...' : '팀 합류하기'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        {hasExistingTeam && (
          <div className="mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/')}
            >
              대시보드로 돌아가기
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
