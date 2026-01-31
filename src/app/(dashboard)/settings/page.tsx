import { auth } from '@/lib/auth'
import { getTeam } from '@/actions/teams'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { InviteCodeSection } from './invite-code-section'
import { RemoveMemberButton } from './remove-member-button'
import { DeleteTeamSection } from './delete-team-section'

export default async function SettingsPage() {
  const session = await auth()
  const result = await getTeam()

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-muted-foreground">팀 정보를 불러오는 데 실패했습니다</p>
      </div>
    )
  }

  const team = result.data
  const isAdmin = team.users.find(u => u.id === session?.user?.id)?.role === 'ADMIN'

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>팀 정보</CardTitle>
          <CardDescription>현재 팀의 정보입니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">팀 이름</span>
            <span className="font-medium">{team.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">총 멤버</span>
            <span className="font-medium">{team._count.users}명</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">총 거래</span>
            <span className="font-medium">{team._count.transactions}건</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>팀 초대</CardTitle>
          <CardDescription>초대 코드를 공유하여 팀원을 초대하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <InviteCodeSection inviteCode={team.inviteCode} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>팀 멤버</CardTitle>
          <CardDescription>{team._count.users}명의 멤버가 있습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {team.users.map((user) => {
              const isCurrentUser = user.id === session?.user?.id
              const currentUserIsAdmin = team.users.find(u => u.id === session?.user?.id)?.role === 'ADMIN'
              const canRemove = currentUserIsAdmin && !isCurrentUser && user.role === 'MEMBER'
              
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.image || ''} alt={user.name || ''} />
                    <AvatarFallback>
                      {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{user.name || '이름 없음'}</p>
                      {user.role === 'ADMIN' && (
                        <Badge variant="secondary" className="text-xs shrink-0">관리자</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {canRemove && (
                    <div className="shrink-0">
                      <RemoveMemberButton memberId={user.id} memberName={user.name} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>팀 삭제</CardTitle>
            <CardDescription>
              팀을 삭제하면 모든 데이터가 영구적으로 삭제됩니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteTeamSection
              teamId={team.id}
              teamName={team.name}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
