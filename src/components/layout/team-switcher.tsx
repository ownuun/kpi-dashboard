'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, ChevronDown, Check, Plus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TeamSwitcherProps {
  teams: Array<{
    id: string
    name: string
    role: 'ADMIN' | 'MEMBER'
  }>
  activeTeamId: string | null
  onSwitch: (teamId: string) => void
  isLoading?: boolean
}

export function TeamSwitcher({ teams, activeTeamId, onSwitch, isLoading }: TeamSwitcherProps) {
  const router = useRouter()
  const activeTeam = teams.find(t => t.id === activeTeamId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{activeTeam?.name || '팀 선택'}</span>
          </div>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]" align="start">
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => onSwitch(team.id)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{team.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={team.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
                {team.role === 'ADMIN' ? '관리자' : '멤버'}
              </Badge>
              {team.id === activeTeamId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        {teams.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={() => router.push('/onboarding')}>
          <Plus className="h-4 w-4" />
          팀 추가하기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
