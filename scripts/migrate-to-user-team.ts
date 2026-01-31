import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateToUserTeam() {
  const isDryRun = process.argv.includes('--dry-run')
  
  console.log(`Starting UserTeam migration... ${isDryRun ? '(DRY RUN)' : ''}`)
  console.log('')

  const usersWithTeam = await prisma.user.findMany({
    where: { teamId: { not: null } },
    select: {
      id: true,
      teamId: true,
      role: true,
      createdAt: true,
      email: true,
    },
  })

  console.log(`Found ${usersWithTeam.length} users with teamId`)

  if (usersWithTeam.length === 0) {
    console.log('No users to migrate.')
    return
  }

  const existingUserTeams = await prisma.userTeam.findMany({
    select: { userId: true, teamId: true },
  })

  const existingSet = new Set(
    existingUserTeams.map((ut) => `${ut.userId}:${ut.teamId}`)
  )

  const toCreate = usersWithTeam.filter(
    (u) => !existingSet.has(`${u.id}:${u.teamId}`)
  )

  console.log(`${toCreate.length} new UserTeam records to create`)
  console.log(`${usersWithTeam.length - toCreate.length} already exist (skipped)`)
  console.log('')

  if (toCreate.length === 0) {
    console.log('Nothing to migrate. All records already exist.')
    return
  }

  console.log('Records to create:')
  for (const user of toCreate.slice(0, 10)) {
    console.log(`  ${user.email} -> team:${user.teamId} (${user.role})`)
  }
  if (toCreate.length > 10) {
    console.log(`  ... and ${toCreate.length - 10} more`)
  }
  console.log('')

  if (isDryRun) {
    console.log(`Would create ${toCreate.length} UserTeam records.`)
    console.log('Run without --dry-run to apply changes.')
    return
  }

  const result = await prisma.userTeam.createMany({
    data: toCreate.map((u) => ({
      userId: u.id,
      teamId: u.teamId!,
      role: u.role,
      isActive: true,
      joinedAt: u.createdAt,
    })),
    skipDuplicates: true,
  })

  console.log(`Migration complete: ${result.count} records created`)

  const finalCount = await prisma.userTeam.count()
  const userWithTeamCount = await prisma.user.count({
    where: { teamId: { not: null } },
  })

  console.log('')
  console.log('Verification:')
  console.log(`  Users with teamId: ${userWithTeamCount}`)
  console.log(`  UserTeam records: ${finalCount}`)
  console.log(`  Match: ${userWithTeamCount === finalCount ? 'YES' : 'NO'}`)
}

migrateToUserTeam()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
