import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getEnabledTemplateCategories } from '@/actions/teams'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.teamId) {
    redirect('/onboarding')
  }

  const templatesResult = await getEnabledTemplateCategories()
  const enabledTemplates = templatesResult.success ? templatesResult.data : ['sales']

  return (
    <div className="min-h-screen bg-slate-50/70">
      <Sidebar enabledTemplates={enabledTemplates} />
      <div className="lg:pl-64">
        <Header user={session.user} enabledTemplates={enabledTemplates} />
        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  )
}
