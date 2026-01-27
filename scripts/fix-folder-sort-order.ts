/**
 * Migration script to fix folder sortOrder values
 * 
 * Problem: Many folders have sortOrder=0, causing them to be sorted alphabetically
 * Solution: Set sortOrder based on createdAt timestamp (earliest = lowest sortOrder)
 * 
 * Run with: npx ts-node scripts/fix-folder-sort-order.ts
 * Or: node -r ts-node/register scripts/fix-folder-sort-order.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixFolderSortOrder() {
  console.log('Starting folder sortOrder migration...\n')

  // Get all folders grouped by owner (userId or teamId) and parentId
  const folders = await prisma.linkFolder.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      sortOrder: true,
      createdAt: true,
      ownerType: true,
      userId: true,
      teamId: true,
      parentId: true,
    },
  })

  // Group folders by their scope (owner + parent combination)
  const groups = new Map<string, typeof folders>()
  
  for (const folder of folders) {
    // Create a unique key for each group (same owner + same parent)
    const ownerKey = folder.ownerType === 'PERSONAL' 
      ? `personal:${folder.userId}` 
      : `team:${folder.teamId}`
    const key = `${ownerKey}:parent:${folder.parentId ?? 'root'}`
    
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(folder)
  }

  console.log(`Found ${groups.size} folder groups to process\n`)

  // Process each group
  let totalUpdated = 0
  const updates: { id: string; sortOrder: number; name: string }[] = []

  for (const [key, groupFolders] of groups) {
    // Sort by createdAt (already sorted, but ensure)
    groupFolders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    
    // Assign sequential sortOrder
    for (let i = 0; i < groupFolders.length; i++) {
      const folder = groupFolders[i]
      const newSortOrder = i
      
      if (folder.sortOrder !== newSortOrder) {
        updates.push({
          id: folder.id,
          sortOrder: newSortOrder,
          name: folder.name,
        })
      }
    }
  }

  if (updates.length === 0) {
    console.log('No folders need updating. All sortOrders are already correct.')
    return
  }

  console.log(`Updating ${updates.length} folders...\n`)

  // Preview changes
  console.log('Changes to be made:')
  for (const update of updates.slice(0, 20)) {
    console.log(`  "${update.name}" -> sortOrder: ${update.sortOrder}`)
  }
  if (updates.length > 20) {
    console.log(`  ... and ${updates.length - 20} more`)
  }
  console.log('')

  // Execute updates in a transaction
  await prisma.$transaction(
    updates.map(update =>
      prisma.linkFolder.update({
        where: { id: update.id },
        data: { sortOrder: update.sortOrder },
      })
    )
  )

  totalUpdated = updates.length
  console.log(`\nSuccessfully updated ${totalUpdated} folders!`)
}

// Run the migration
fixFolderSortOrder()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
