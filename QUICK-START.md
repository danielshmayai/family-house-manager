# 🚀 Quick Start Guide - Modular Family House Manager

Get up and running in 5 minutes!

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn
- SQLite (included with Node.js)

## ⚡ Quick Setup (Automated)

### Option 1: Using the setup script (Windows)
```bash
.\setup-modular.bat
```

### Option 2: Using npm script
```bash
npm run setup
```

This will:
1. ✅ Install all dependencies
2. ✅ Run database migrations
3. ✅ Seed with default categories and activities
4. ✅ Generate Prisma client

## 🔧 Manual Setup

If you prefer step-by-step control:

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Create and run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### 3. Seed Default Data
```bash
# Seed with modular categories and activities
npm run seed:modular
```

### 4. Start Development Server
```bash
npm run dev
```

## 🌐 Access the Application

Once running, visit:

- **Home**: http://localhost:3000
- **Admin**: http://localhost:3000/admin
- **Leaderboard**: http://localhost:3000/leaderboard
- **Team**: http://localhost:3000/users

## 🎯 First Steps

### 1. Create an Account (if not exists)
1. Go to http://localhost:3000/auth/register
2. Create your admin account
3. Sign in

### 2. Explore Pre-Loaded Data
The system comes with 4 categories and 14 activities:
- 🏠 Household Chores (4 activities)
- 🧹 Kitchen & Cleaning (4 activities)
- 💪 Personal Care (3 activities)
- 🔧 Home Maintenance (3 activities)

### 3. Complete Your First Activity
1. Go to home page
2. Click any activity card
3. Watch your points go up! 🎉

### 4. Customize Your System
1. Go to `/admin`
2. Click "➕ New Category" to add your own
3. Add custom activities to any category
4. Choose icons and colors that match your style

## 📊 Default Categories

After seeding, you'll have:

### 🏠 Household Chores (Blue)
- Take out trash - 10 pts (Daily)
- Vacuum floors - 15 pts (Weekly)
- Do laundry - 20 pts (Weekly)
- Water plants - 5 pts (Daily)

### 🧹 Kitchen & Cleaning (Green)
- Wash dishes - 10 pts (Daily)
- Clean kitchen - 15 pts (Daily)
- Clean bathroom - 20 pts (Weekly)
- Organize pantry - 15 pts (Monthly)

### 💪 Personal Care (Amber)
- Exercise - 25 pts (Daily)
- Meditate - 15 pts (Daily)
- Read a book - 10 pts (Daily)

### 🔧 Home Maintenance (Red)
- Fix leak - 30 pts (Anytime)
- Change light bulb - 5 pts (Anytime)
- Yard work - 25 pts (Weekly)

## 🎨 Customization Ideas

### For Families with Kids
Create categories like:
- 📚 Homework (Study 30 min, Complete assignment)
- 🧸 Room Care (Make bed, Organize toys)
- 🎨 Creative Time (Draw, Play music)

### For Roommates
Categories like:
- 🍳 Cooking Duties (Cook dinner, Meal prep)
- 💰 Bill Management (Pay rent, Split utilities)
- 🎮 Common Areas (Living room, Game room)

### For Solo Living
Categories like:
- 💼 Work Tasks (Deep work session, Clear inbox)
- 🏋️ Fitness Goals (Workout, Walk 10k steps)
- 🧘 Self-Care (Journal, Skincare routine)

## 🔄 Reset & Re-seed

If you want to start fresh:

```bash
# Reset database (WARNING: Deletes all data!)
npm run prisma:reset

# Re-seed
npm run seed:modular
```

## 🐛 Troubleshooting

### "Module not found" error
```bash
npm install
npx prisma generate
```

### "Table does not exist" error
```bash
npx prisma migrate dev
```

### Activities don't show up
1. Check browser console for errors
2. Verify you have categories with `isActive = true`
3. Run seed: `npm run seed:modular`

### Can't complete activities
1. Make sure you're logged in
2. Check that your user has a household assigned
3. Verify the activity exists and is active

## 📱 Mobile Testing

The app is mobile-friendly! Test it:
1. Open Chrome DevTools (F12)
2. Click the device toolbar icon
3. Select a mobile device
4. Enjoy the responsive design!

## 🎓 Learning Path

### Day 1: Explore
- ✅ Complete a few activities
- ✅ Check the leaderboard
- ✅ View your team members

### Day 2: Customize
- ✅ Create your first category
- ✅ Add your first custom activity
- ✅ Customize icons and colors

### Day 3: Manage
- ✅ Edit existing activities
- ✅ Adjust point values
- ✅ Add team members

### Week 1: Master
- ✅ Create a full system for your household
- ✅ Track progress on leaderboard
- ✅ Build streaks and compete!

## 🎯 Pro Tips

1. **Start Small**: Begin with 2-3 categories
2. **Point Balance**: 5-10 for quick tasks, 20-30 for major ones
3. **Visual Appeal**: Use colorful emojis for better UX
4. **Frequency Matters**: Set realistic frequencies
5. **Team Buy-in**: Get everyone involved in setup

## 📚 Documentation

- **Full Guide**: See [MODULAR-README.md](MODULAR-README.md)
- **Migration**: See [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md)
- **Visual Guide**: See [VISUAL-GUIDE.md](VISUAL-GUIDE.md)
- **Summary**: See [REFACTORING-SUMMARY.md](REFACTORING-SUMMARY.md)

## 🆘 Need Help?

Common commands:

```bash
# Start development server
npm run dev

# Reset database
npm run prisma:reset

# Seed database
npm run seed:modular

# Run migrations
npx prisma migrate dev

# View database
npx prisma studio
```

## 🎉 You're Ready!

Your modular Family House Manager is set up and ready to use!

Start customizing it to fit your household's unique needs. Make chores fun, track progress, and build healthy competition with your family or roommates!

Happy household managing! 🏠✨

---

**Next Steps**:
1. 🏠 Complete your first activity
2. ⚙️ Customize categories in admin
3. 🏆 Check your ranking on leaderboard
4. 👥 Invite team members
