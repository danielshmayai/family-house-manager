# 🚀 Migration Guide: Upgrading to Modular System

This guide will help you migrate your existing Family House Manager to the new modular architecture.

## ⚠️ Before You Start

1. **Backup your database**
   ```bash
   copy prisma\dev.db prisma\dev.db.backup
   ```

2. **Backup your environment**
   ```bash
   copy .env .env.backup
   ```

## 📋 Migration Steps

### Step 1: Update Database Schema

Run the Prisma migration to add the new Activity model and update existing models:

```bash
npx prisma migrate dev --name add_modular_activities
```

This will:
- Create the new `Activity` table
- Add new fields to `Category` (description, icon, color, position, isActive, householdId, updatedAt)
- Add new fields to `Event` (activityId, points)
- Keep the old `Task` table for backward compatibility

### Step 2: Seed Default Data

Populate your database with default categories and activities:

```bash
npx ts-node prisma/seed-modular.ts
```

This creates:
- 4 default categories (Household, Kitchen, Personal Care, Maintenance)
- 14 sample activities across all categories

### Step 3: Test the Application

Start the development server:

```bash
npm run dev
```

Visit these pages to verify everything works:

1. **Home Page** (`http://localhost:3000`)
   - Should show category tabs
   - Display activities in a grid
   - Allow completing activities with point rewards

2. **Admin Page** (`http://localhost:3000/admin`)
   - Should show all categories as cards
   - Allow creating/editing/deleting categories
   - Allow managing activities within each category

3. **Leaderboard** (`http://localhost:3000/leaderboard`)
   - Should show enhanced UI with time range selector
   - Display user rankings with medals and stats

4. **Team Page** (`http://localhost:3000/users`)
   - Should show member cards with avatars
   - Allow editing names and roles (for admins)

### Step 4: Migrate Existing Data (Optional)

If you have existing tasks and want to convert them to the new activity system:

```bash
npx ts-node scripts/migrate-tasks-to-activities.ts
```

Create this script at `scripts/migrate-tasks-to-activities.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  console.log('Migrating tasks to activities...')
  
  const tasks = await prisma.task.findMany({ include: { category: true } })
  
  for (const task of tasks) {
    await prisma.activity.create({
      data: {
        key: task.key,
        categoryId: task.categoryId || '',
        name: task.name,
        description: task.description || undefined,
        defaultPoints: task.defaultPoints,
        frequency: task.frequency,
        isActive: true,
        requiresNote: false,
        requiresPhoto: false,
        position: 0,
        createdById: task.createdById
      }
    })
  }
  
  console.log(`Migrated ${tasks.length} tasks to activities`)
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### Step 5: Update Events

If you have existing events referencing tasks, you may want to update them to reference activities:

```sql
-- This is handled by the schema allowing both taskId and activityId
-- New events will use activityId, old events keep taskId for backward compatibility
```

## 🎯 What's New

### For End Users
- ✨ Beautiful card-based activity interface
- 🎨 Color-coded categories with custom icons
- 📊 Enhanced leaderboard with multiple time ranges
- 👥 Better team member management
- 🎉 Instant feedback when completing activities
- 📱 Improved mobile experience

### For Admins
- 🔧 Complete control over categories and activities
- 🎨 Visual customization (icons, colors)
- ⚡ Create/edit/delete without code changes
- 📋 Organize activities with positions
- 🔄 Enable/disable without deleting
- 💡 Extensible config field for future features

## 🔧 Configuration Options

### Environment Variables

No new environment variables required. The system uses your existing DATABASE_URL.

### Customization

You can customize the application by editing:

**Icons**: `/app/admin/page.tsx` - `iconOptions` array
**Colors**: `/app/admin/page.tsx` - `colorOptions` array
**Default Categories**: `/prisma/seed-modular.ts`

## 🐛 Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution**: Your database already has some of the new schema. Reset and try again:
```bash
npx prisma migrate reset
npx ts-node prisma/seed-modular.ts
```

### Issue: Activities don't show up on home page

**Solution**: 
1. Check that categories have `isActive = true`
2. Check that activities have `isActive = true`
3. Verify activities are assigned to a category

### Issue: Can't complete activities

**Solution**:
1. Make sure you're logged in
2. Verify your user has a `householdId`
3. Check browser console for errors

### Issue: Old task data disappeared

**Solution**: 
- The Task table still exists for backward compatibility
- Old tasks are not automatically converted - use the migration script above
- Check `/api/tasks` endpoint still works

## 🎓 Learning the New System

### Admin Workflow
1. Create categories first (one for each area of your household)
2. Add activities to each category
3. Customize icons, colors, and point values
4. Use the Active toggle to enable/disable without deleting

### User Workflow
1. Go to home page
2. Select a category from the tabs
3. Click any activity card to complete it
4. Earn points and climb the leaderboard!

## 📚 Additional Resources

- [MODULAR-README.md](./MODULAR-README.md) - Complete feature documentation
- [Prisma Schema](./prisma/schema.prisma) - Database structure
- [API Documentation](./MODULAR-README.md#api-endpoints) - Endpoint reference

## ✅ Verification Checklist

Before considering migration complete:

- [ ] Database migrated successfully
- [ ] Default data seeded
- [ ] Home page displays categories and activities
- [ ] Can complete activities and earn points
- [ ] Admin page allows creating/editing categories
- [ ] Admin page allows managing activities
- [ ] Leaderboard shows rankings correctly
- [ ] Team page displays members
- [ ] All old functionality still works
- [ ] Mobile view looks good

## 🎉 You're Done!

Your Family House Manager is now fully modular and ready for customization!

Enjoy the new features and happy household managing! 🏠✨
