import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with modular categories and activities...')

  // Create default categories
  const householdCategory = await prisma.category.upsert({
    where: { key: 'household-chores' },
    update: {},
    create: {
      key: 'household-chores',
      name: 'Household Chores',
      description: 'Daily and weekly household maintenance tasks',
      icon: '🏠',
      color: '#3B82F6',
      position: 0,
      isActive: true
    }
  })

  const kitchenCategory = await prisma.category.upsert({
    where: { key: 'kitchen-cleaning' },
    update: {},
    create: {
      key: 'kitchen-cleaning',
      name: 'Kitchen & Cleaning',
      description: 'Kitchen and cleaning activities',
      icon: '🧹',
      color: '#10B981',
      position: 1,
      isActive: true
    }
  })

  const personalCategory = await prisma.category.upsert({
    where: { key: 'personal-care' },
    update: {},
    create: {
      key: 'personal-care',
      name: 'Personal Care',
      description: 'Personal wellness and self-care',
      icon: '💪',
      color: '#F59E0B',
      position: 2,
      isActive: true
    }
  })

  const maintenanceCategory = await prisma.category.upsert({
    where: { key: 'home-maintenance' },
    update: {},
    create: {
      key: 'home-maintenance',
      name: 'Home Maintenance',
      description: 'Repairs and home improvement',
      icon: '🔧',
      color: '#EF4444',
      position: 3,
      isActive: true
    }
  })

  console.log('✅ Created categories')

  // Create activities for Household Chores
  const householdActivities = [
    {
      key: 'take-out-trash',
      name: 'Take out trash',
      description: 'Empty all trash bins and take to outside bin',
      icon: '🗑️',
      defaultPoints: 10,
      frequency: 'DAILY',
      position: 0
    },
    {
      key: 'vacuum-floors',
      name: 'Vacuum floors',
      description: 'Vacuum all carpets and rugs',
      icon: '🧹',
      defaultPoints: 15,
      frequency: 'WEEKLY',
      position: 1
    },
    {
      key: 'do-laundry',
      name: 'Do laundry',
      description: 'Wash, dry, and fold clothes',
      icon: '🧺',
      defaultPoints: 20,
      frequency: 'WEEKLY',
      position: 2
    },
    {
      key: 'water-plants',
      name: 'Water plants',
      description: 'Water all indoor and outdoor plants',
      icon: '🌱',
      defaultPoints: 5,
      frequency: 'DAILY',
      position: 3
    }
  ]

  for (const activity of householdActivities) {
    await prisma.activity.upsert({
      where: { key: activity.key },
      update: {},
      create: {
        ...activity,
        categoryId: householdCategory.id,
        isActive: true,
        requiresNote: false,
        requiresPhoto: false,
        createdById: 'system'
      }
    })
  }

  // Create activities for Kitchen & Cleaning
  const kitchenActivities = [
    {
      key: 'wash-dishes',
      name: 'Wash dishes',
      description: 'Clean all dishes and put them away',
      icon: '🍽️',
      defaultPoints: 10,
      frequency: 'DAILY',
      position: 0
    },
    {
      key: 'clean-kitchen',
      name: 'Clean kitchen',
      description: 'Wipe counters, clean stove, and mop floor',
      icon: '🧽',
      defaultPoints: 15,
      frequency: 'DAILY',
      position: 1
    },
    {
      key: 'clean-bathroom',
      name: 'Clean bathroom',
      description: 'Clean toilet, sink, and shower',
      icon: '🚿',
      defaultPoints: 20,
      frequency: 'WEEKLY',
      position: 2
    },
    {
      key: 'organize-pantry',
      name: 'Organize pantry',
      description: 'Sort and organize pantry items',
      icon: '📦',
      defaultPoints: 15,
      frequency: 'MONTHLY',
      position: 3
    }
  ]

  for (const activity of kitchenActivities) {
    await prisma.activity.upsert({
      where: { key: activity.key },
      update: {},
      create: {
        ...activity,
        categoryId: kitchenCategory.id,
        isActive: true,
        requiresNote: false,
        requiresPhoto: false,
        createdById: 'system'
      }
    })
  }

  // Create activities for Personal Care
  const personalActivities = [
    {
      key: 'exercise',
      name: 'Exercise',
      description: '30 minutes of physical activity',
      icon: '🏃',
      defaultPoints: 25,
      frequency: 'DAILY',
      position: 0
    },
    {
      key: 'meditate',
      name: 'Meditate',
      description: '10 minutes of mindfulness',
      icon: '🧘',
      defaultPoints: 15,
      frequency: 'DAILY',
      position: 1
    },
    {
      key: 'read-book',
      name: 'Read a book',
      description: 'Read for 20 minutes',
      icon: '📚',
      defaultPoints: 10,
      frequency: 'DAILY',
      position: 2
    }
  ]

  for (const activity of personalActivities) {
    await prisma.activity.upsert({
      where: { key: activity.key },
      update: {},
      create: {
        ...activity,
        categoryId: personalCategory.id,
        isActive: true,
        requiresNote: false,
        requiresPhoto: false,
        createdById: 'system'
      }
    })
  }

  // Create activities for Home Maintenance
  const maintenanceActivities = [
    {
      key: 'fix-leak',
      name: 'Fix leak',
      description: 'Repair any plumbing leaks',
      icon: '🔧',
      defaultPoints: 30,
      frequency: 'ANYTIME',
      position: 0
    },
    {
      key: 'change-light-bulb',
      name: 'Change light bulb',
      description: 'Replace burnt out bulbs',
      icon: '💡',
      defaultPoints: 5,
      frequency: 'ANYTIME',
      position: 1
    },
    {
      key: 'yard-work',
      name: 'Yard work',
      description: 'Mow lawn, trim hedges, or garden',
      icon: '🌿',
      defaultPoints: 25,
      frequency: 'WEEKLY',
      position: 2
    }
  ]

  for (const activity of maintenanceActivities) {
    await prisma.activity.upsert({
      where: { key: activity.key },
      update: {},
      create: {
        ...activity,
        categoryId: maintenanceCategory.id,
        isActive: true,
        requiresNote: false,
        requiresPhoto: false,
        createdById: 'system'
      }
    })
  }

  console.log('✅ Created activities')
  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
