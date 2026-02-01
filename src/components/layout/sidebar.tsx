'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ChevronDown, MessageCircle, Settings, Puzzle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { navigationConfig, type NavCategory } from '@/config/navigation'
import { TeamSwitcher } from './team-switcher'
import { switchTeam, getUserTeams } from '@/actions/teams'

interface SidebarProps {
  enabledTemplates?: string[]
}

function NavCategorySection({ category }: { category: NavCategory }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(category.defaultOpen ?? false)
  
  const hasActiveItem = category.items.some(item => 
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  )

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          hasActiveItem
            ? 'text-slate-900'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
        )}
      >
        <span className="flex items-center gap-2">
          <category.icon className="h-4 w-4" />
          {category.label}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-96' : 'max-h-0'
        )}
      >
        <div className="ml-4 space-y-1 border-l border-slate-200 pl-3">
          {category.items.map((item) => {
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ enabledTemplates = ['sales'] }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, update } = useSession()
  const [isPending, startTransition] = useTransition()
  const [fetchedTeams, setFetchedTeams] = useState<Array<{ id: string; name: string; role: 'ADMIN' | 'MEMBER' }>>([])
  const [mounted, setMounted] = useState(false)
  
  const filteredNavigation = useMemo(() => {
    return navigationConfig.filter((category) => {
      if (category.key === 'settings') return false
      if (!category.isTemplate) return true
      return enabledTemplates.includes(category.key)
    })
  }, [enabledTemplates])

  const sessionTeams = session?.user?.teams || []
  const teams = sessionTeams.length > 0 ? sessionTeams : fetchedTeams
  const activeTeamId = session?.user?.activeTeamId || session?.user?.teamId || null

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (session?.user?.id && fetchedTeams.length === 0) {
      getUserTeams().then((result) => {
        if (result.success && result.data.length > 0) {
          setFetchedTeams(result.data)
        }
      })
    }
  }, [session?.user?.id, fetchedTeams.length])

  const handleSwitchTeam = (teamId: string) => {
    if (teamId === activeTeamId) return
    
    startTransition(async () => {
      const result = await switchTeam(teamId)
      if (result.success) {
        await update({ activeTeamId: teamId })
        toast.success(`${result.data.teamName} 팀으로 전환했습니다`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }



  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200/70 bg-white hidden lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-slate-200/70 px-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="" className="h-7 w-7" />
          <img src="/logo.png" alt="Slit" className="h-5" />
        </Link>
      </div>

      {mounted && session?.user && (
        <div className="px-4 pt-4">
          <TeamSwitcher
            teams={teams}
            activeTeamId={activeTeamId}
            onSwitch={handleSwitchTeam}
            isLoading={isPending || teams.length === 0}
          />
        </div>
      )}

      <nav className="flex-1 p-4 space-y-2">
        {filteredNavigation.map((category) => (
          <NavCategorySection key={category.key} category={category} />
        ))}
      </nav>

      <div className="border-t border-slate-200/70 p-4 space-y-1">
        <Link
          href="/settings/templates"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname === '/settings/templates'
              ? 'bg-slate-100 text-slate-900 font-medium'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          )}
        >
          <Puzzle className="h-4 w-4" />
          템플릿 보기
        </Link>
        <Link
          href="/contact"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname === '/contact'
              ? 'bg-slate-100 text-slate-900 font-medium'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          )}
        >
          <MessageCircle className="h-4 w-4" />
          문의
        </Link>
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname === '/settings'
              ? 'bg-slate-100 text-slate-900 font-medium'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          )}
        >
          <Settings className="h-4 w-4" />
          설정
        </Link>
      </div>
    </aside>
  )
}
