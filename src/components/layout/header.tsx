import { signOut } from '@/lib/auth'
import { MobileNav } from './mobile-nav'
import { UserMenu } from './user-menu'

interface HeaderProps {
  user: {
    name?: string | null
    email: string
    image?: string | null
  }
  enabledTemplates?: string[]
}

export function Header({ user, enabledTemplates = ['sales'] }: HeaderProps) {
  const handleSignOut = async () => {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/80 backdrop-blur-sm px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-3 lg:hidden">
        <MobileNav enabledTemplates={enabledTemplates} />
        <img src="/logo.png" alt="Slit" className="h-6" />
      </div>

      <div className="ml-auto">
        <UserMenu user={user} signOutAction={handleSignOut} />
      </div>
    </header>
  )
}
