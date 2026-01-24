import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 기존 팀의 첫 번째 유저를 ADMIN으로 설정하고 creatorId 연결
  const teams = await prisma.team.findMany({
    include: {
      users: {
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  })

  for (const team of teams) {
    if (team.users.length > 0) {
      const firstUser = team.users[0]
      
      // 팀 creatorId 설정
      await prisma.team.update({
        where: { id: team.id },
        data: { creatorId: firstUser.id },
      })
      
      // 첫 유저를 ADMIN으로 설정
      await prisma.user.update({
        where: { id: firstUser.id },
        data: { role: 'ADMIN' },
      })
      
      console.log(`Team "${team.name}": ${firstUser.email} set as ADMIN`)
    }
  }

  // 나머지 유저들은 MEMBER로 설정 (이미 기본값이지만 명시적으로)
  await prisma.user.updateMany({
    where: { role: { not: 'ADMIN' } },
    data: { role: 'MEMBER' },
  })

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
