# 🏠 Family House Manager - Modular Activity System

A modern, fully modular household activity management application with dynamic categories, customizable activities, and an intuitive admin interface.

## 🌟 Key Features

### ✨ Fully Modular Architecture
- **Dynamic Categories**: Create, edit, and delete categories on the fly
- **Customizable Activities**: Add unlimited activities per category with custom icons, points, and frequencies
- **Flexible Configuration**: Each activity can have unique settings (points, frequency, requirements)
- **No Code Changes Needed**: All configuration done through the admin UI

### 🎨 User-Friendly Interface
- **Modern Design**: Beautiful gradient UI with card-based layouts
- **Intuitive Admin Panel**: Easy-to-use modals for category and activity management
- **Visual Customization**: Choose icons and colors for categories
- **Drag-and-Drop Ready**: Position field for future drag-to-reorder functionality

### 📊 Enhanced Scoring System
- **Points Tracking**: Each activity awards configurable points
- **Leaderboard**: Multiple time ranges (daily, weekly, monthly, all-time)
- **Family Total Score**: See combined household achievements
- **Activity Streaks**: Track consecutive days of completion
- **Real-time Updates**: Instant feedback when completing activities

### 👥 Team Management
- **Member Profiles**: Beautiful avatar-based user cards
- **Role Management**: Admin and Member roles
- **Easy Editing**: Quick role and name updates
- **Member Stats**: See join dates and activity levels

## 🗂️ Data Models

### Category
```typescript
{
  id: string
  key: string (unique)
  name: string
  description?: string
  icon?: string (emoji)
  color?: string (hex color)
  position: number (for ordering)
  isActive: boolean
  householdId?: string (multi-household support)
  activities: Activity[]
}
```

### Activity
```typescript
{
  id: string
  key: string (unique)
  categoryId: string
  name: string
  description?: string
  icon?: string (emoji)
  defaultPoints: number
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANYTIME'
  position: number
  isActive: boolean
  requiresNote: boolean
  requiresPhoto: boolean
  config?: string (JSON for future extensions)
}
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Run migrations
npx prisma migrate dev

# Seed with default categories and activities
npx prisma db seed
```

Or use the new modular seed:
```bash
npx ts-node prisma/seed-modular.ts
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Access the Application
- **Home**: http://localhost:3000 - Main activity dashboard
- **Admin**: http://localhost:3000/admin - Category & activity management
- **Leaderboard**: http://localhost:3000/leaderboard - Scoring and rankings
- **Team**: http://localhost:3000/users - Member management

## 📖 How to Use

### For Admins

#### Creating a Category
1. Go to `/admin`
2. Click "➕ New Category"
3. Choose an icon and color
4. Enter name and optional description
5. Click "Save"

#### Adding Activities
1. Find the category card
2. Click "+ Add" in the Activities section
3. Configure:
   - Icon (emoji)
   - Name and description
   - Points value
   - Frequency (Daily, Weekly, Monthly, Anytime)
   - Requirements (note, photo)
4. Click "Save"

#### Editing & Deleting
- Click ✏️ to edit any category or activity
- Click 🗑️ to delete (with confirmation)
- Use the Active checkbox to hide without deleting

### For Users

#### Completing Activities
1. Go to home page (`/`)
2. Select a category tab
3. Click on any activity card to complete it
4. Earn points and see instant feedback!

#### Viewing Progress
- **Stats Bar**: See today's completions and available activities
- **Timeline**: View all completed activities with timestamps
- **Leaderboard**: Compare scores with household members

#### Managing Team
1. Go to `/users`
2. View all household members
3. Admins can:
   - Edit member names and roles
   - Remove members from household

## 🎯 Default Categories & Activities

The system comes pre-seeded with 4 categories and 14 activities:

### 🏠 Household Chores
- Take out trash (10 pts, Daily)
- Vacuum floors (15 pts, Weekly)
- Do laundry (20 pts, Weekly)
- Water plants (5 pts, Daily)

### 🧹 Kitchen & Cleaning
- Wash dishes (10 pts, Daily)
- Clean kitchen (15 pts, Daily)
- Clean bathroom (20 pts, Weekly)
- Organize pantry (15 pts, Monthly)

### 💪 Personal Care
- Exercise (25 pts, Daily)
- Meditate (15 pts, Daily)
- Read a book (10 pts, Daily)

### 🔧 Home Maintenance
- Fix leak (30 pts, Anytime)
- Change light bulb (5 pts, Anytime)
- Yard work (25 pts, Weekly)

## 🔧 API Endpoints

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `PUT /api/categories` - Update category
- `DELETE /api/categories?id={id}` - Delete category

### Activities
- `GET /api/activities` - List all activities
- `GET /api/activities?categoryId={id}` - Activities by category
- `POST /api/activities` - Create activity
- `PUT /api/activities` - Update activity
- `DELETE /api/activities?id={id}` - Delete activity

### Events
- `GET /api/events/today` - Today's completed activities
- `POST /api/events` - Record activity completion

### Leaderboard
- `GET /api/leaderboard?householdId={id}&range={range}` - Get rankings

## 🎨 Customization

### Adding New Icons
Edit the `iconOptions` array in `/app/admin/page.tsx`:
```typescript
const iconOptions = ['📌', '🏠', '🧹', '🍽️', '🧺', '🌱', '🔧', '💪', '📚', '🎯', '⭐', '✓', '✨', '🎨', '💼']
```

### Adding New Colors
Edit the `colorOptions` array:
```typescript
const colorOptions = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']
```

### Adding Frequency Types
Update the frequency select in the activity modal and the Prisma schema.

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first design approach
- Touch-friendly buttons and cards
- Horizontal scrolling for category tabs
- Grid layouts that adapt to screen size
- Fixed bottom navigation on mobile

## 🔮 Future Enhancements

### Planned Features
- [ ] Drag-and-drop reordering for categories and activities
- [ ] Photo upload for activity completion
- [ ] Notes/comments on completed activities
- [ ] Activity history and analytics
- [ ] Recurring activity reminders
- [ ] Multi-household support
- [ ] Activity templates and sharing
- [ ] Points multipliers and bonuses
- [ ] Achievement badges and milestones
- [ ] Export data to CSV/PDF
- [ ] Dark mode theme

### Extension Points
The `config` field on activities supports JSON for future custom properties:
```typescript
{
  config: JSON.stringify({
    reminderTime: '09:00',
    difficulty: 'medium',
    estimatedMinutes: 30,
    customFields: { ... }
  })
}
```

## 🤝 Contributing

This modular architecture makes it easy to extend:
1. Add new activity types in the schema
2. Create new API endpoints for custom features
3. Build additional UI components
4. Extend the scoring algorithm
5. Add integrations (calendar, notifications, etc.)

## 📄 License

MIT License - feel free to use and modify for your household!

## 🎉 Enjoy!

Make household management fun and rewarding for everyone in your family!
