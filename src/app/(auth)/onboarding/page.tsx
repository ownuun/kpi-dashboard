import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const hasExistingTeam = !!(session.user.teamId || session.user.activeTeamId || (session.user.teams && session.user.teams.length > 0))

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <OnboardingForm userName={session.user.name} hasExistingTeam={hasExistingTeam} />
    </div>
  )
}
