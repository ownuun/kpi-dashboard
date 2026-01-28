import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const templateCategories = [
    { key: 'sales', name: '매출관리', description: '매출 및 수익 관련 기능', icon: 'TrendingUp', order: 0 },
    { key: 'hr', name: '인사관리', description: '직원 및 조직 관리 기능', icon: 'Users', order: 1 },
    { key: 'finance', name: '재무관리', description: '재무 및 회계 관련 기능', icon: 'Wallet', order: 2 },
    { key: 'marketing', name: '마케팅', description: '마케팅 및 캠페인 관리 기능', icon: 'Megaphone', order: 3 },
  ]

  for (const category of templateCategories) {
    await prisma.templateCategory.upsert({
      where: { key: category.key },
      update: {
        name: category.name,
        description: category.description,
        icon: category.icon,
        order: category.order,
      },
      create: category,
    })
    console.log(`  ✓ Template category: ${category.name}`)
  }

  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
