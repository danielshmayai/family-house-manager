import { PrismaClient } from '@prisma/client'

type DefaultCategory = {
  key: string
  name: string
  description: string
  icon: string
  color: string
  position: number
  activities: {
    key: string
    name: string
    description: string
    icon: string
    defaultPoints: number
    frequency: string
    position: number
  }[]
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    key: 'household-chores',
    name: 'Household Chores',
    description: 'Daily and weekly household maintenance tasks',
    icon: '🏠',
    color: '#3B82F6',
    position: 0,
    activities: [
      { key: 'take-out-trash', name: 'Take out trash', description: 'Empty all trash bins and take to outside bin', icon: '🗑️', defaultPoints: 10, frequency: 'DAILY', position: 0 },
      { key: 'vacuum-floors', name: 'Vacuum floors', description: 'Vacuum all carpets and rugs', icon: '🧹', defaultPoints: 15, frequency: 'WEEKLY', position: 1 },
      { key: 'do-laundry', name: 'Do laundry', description: 'Wash, dry, and fold clothes', icon: '🧺', defaultPoints: 20, frequency: 'WEEKLY', position: 2 },
      { key: 'water-plants', name: 'Water plants', description: 'Water all indoor and outdoor plants', icon: '🌱', defaultPoints: 5, frequency: 'DAILY', position: 3 },
      { key: 'make-bed', name: 'Make bed', description: 'Make your bed neat and tidy', icon: '🛏️', defaultPoints: 5, frequency: 'DAILY', position: 4 },
      { key: 'tidy-room', name: 'Tidy up room', description: 'Pick up items and organize your room', icon: '🧹', defaultPoints: 10, frequency: 'DAILY', position: 5 },
    ]
  },
  {
    key: 'kitchen-cooking',
    name: 'Kitchen & Cooking',
    description: 'Cooking, cleaning, and kitchen duties',
    icon: '🍳',
    color: '#10B981',
    position: 1,
    activities: [
      { key: 'wash-dishes', name: 'Wash dishes', description: 'Clean all dishes and put them away', icon: '🍽️', defaultPoints: 10, frequency: 'DAILY', position: 0 },
      { key: 'cook-meal', name: 'Cook a meal', description: 'Prepare a meal for the family', icon: '👨‍🍳', defaultPoints: 25, frequency: 'DAILY', position: 1 },
      { key: 'clean-kitchen', name: 'Clean kitchen', description: 'Wipe counters, clean stove, and mop floor', icon: '🧽', defaultPoints: 15, frequency: 'DAILY', position: 2 },
      { key: 'set-table', name: 'Set the table', description: 'Set plates, cutlery, and glasses for a meal', icon: '🍴', defaultPoints: 5, frequency: 'DAILY', position: 3 },
      { key: 'grocery-shopping', name: 'Grocery shopping', description: 'Buy groceries for the family', icon: '🛒', defaultPoints: 20, frequency: 'WEEKLY', position: 4 },
      { key: 'empty-dishwasher', name: 'Empty dishwasher', description: 'Unload clean dishes and put them away', icon: '✨', defaultPoints: 8, frequency: 'DAILY', position: 5 },
    ]
  },
  {
    key: 'pets-animals',
    name: 'Pet Care',
    description: 'Taking care of the family pets',
    icon: '🐾',
    color: '#F59E0B',
    position: 2,
    activities: [
      { key: 'feed-pet', name: 'Feed the pet', description: 'Give food and fresh water', icon: '🐕', defaultPoints: 10, frequency: 'DAILY', position: 0 },
      { key: 'walk-dog', name: 'Walk the dog', description: 'Take the dog for a walk', icon: '🦮', defaultPoints: 20, frequency: 'DAILY', position: 1 },
      { key: 'clean-litter', name: 'Clean litter box', description: 'Scoop and clean the litter box', icon: '🐈', defaultPoints: 10, frequency: 'DAILY', position: 2 },
      { key: 'brush-pet', name: 'Brush the pet', description: 'Brush fur to keep them clean and happy', icon: '🪮', defaultPoints: 10, frequency: 'WEEKLY', position: 3 },
    ]
  },
  {
    key: 'personal-wellness',
    name: 'Personal & Wellness',
    description: 'Self-care, exercise, and personal growth',
    icon: '💪',
    color: '#8B5CF6',
    position: 3,
    activities: [
      { key: 'exercise-30min', name: 'Exercise 30 min', description: '30 minutes of physical activity', icon: '🏃', defaultPoints: 25, frequency: 'DAILY', position: 0 },
      { key: 'read-book', name: 'Read a book', description: 'Read for at least 20 minutes', icon: '📚', defaultPoints: 15, frequency: 'DAILY', position: 1 },
      { key: 'practice-instrument', name: 'Practice instrument', description: 'Practice a musical instrument for 15+ min', icon: '🎵', defaultPoints: 15, frequency: 'DAILY', position: 2 },
      { key: 'homework', name: 'Do homework', description: 'Complete school assignments', icon: '📝', defaultPoints: 20, frequency: 'DAILY', position: 3 },
      { key: 'drink-water', name: 'Drink 8 glasses of water', description: 'Stay hydrated throughout the day', icon: '💧', defaultPoints: 5, frequency: 'DAILY', position: 4 },
    ]
  },
  {
    key: 'outdoor-garden',
    name: 'Outdoor & Garden',
    description: 'Yard work, gardening, and outdoor maintenance',
    icon: '🌿',
    color: '#059669',
    position: 4,
    activities: [
      { key: 'mow-lawn', name: 'Mow the lawn', description: 'Mow and edge the lawn', icon: '🌾', defaultPoints: 30, frequency: 'WEEKLY', position: 0 },
      { key: 'pull-weeds', name: 'Pull weeds', description: 'Weed the garden beds', icon: '🌻', defaultPoints: 15, frequency: 'WEEKLY', position: 1 },
      { key: 'sweep-porch', name: 'Sweep porch/patio', description: 'Sweep outdoor areas clean', icon: '🧹', defaultPoints: 10, frequency: 'WEEKLY', position: 2 },
      { key: 'wash-car', name: 'Wash the car', description: 'Wash and dry the family car', icon: '🚗', defaultPoints: 25, frequency: 'MONTHLY', position: 3 },
    ]
  },
  {
    key: 'kindness-bonus',
    name: 'Kindness & Bonus',
    description: 'Extra credit for being kind and helpful',
    icon: '❤️',
    color: '#EC4899',
    position: 5,
    activities: [
      { key: 'help-sibling', name: 'Help a sibling', description: 'Help your brother or sister with something', icon: '🤝', defaultPoints: 15, frequency: 'ANYTIME', position: 0 },
      { key: 'surprise-chore', name: 'Surprise chore', description: 'Do a chore without being asked', icon: '🌟', defaultPoints: 20, frequency: 'ANYTIME', position: 1 },
      { key: 'thank-someone', name: 'Thank someone', description: 'Write a thank-you note or say something kind', icon: '💌', defaultPoints: 10, frequency: 'ANYTIME', position: 2 },
      { key: 'teach-something', name: 'Teach something', description: 'Teach a family member a skill or trick', icon: '🎓', defaultPoints: 15, frequency: 'ANYTIME', position: 3 },
    ]
  }
]

export const DEFAULT_CATEGORIES_HE: DefaultCategory[] = [
  {
    key: 'mishimot-bayit',
    name: 'משימות בית',
    description: 'משימות תחזוקה יומיות ושבועיות בבית',
    icon: '🏠',
    color: '#3B82F6',
    position: 0,
    activities: [
      { key: 'seder-heder', name: 'סדר את החדר', description: 'אסוף חפצים וסדר את החדר שלך', icon: '🛏️', defaultPoints: 10, frequency: 'DAILY', position: 0 },
      { key: 'shtiifat-kelim', name: 'שטיפת כלים', description: 'שטוף את כל הכלים והנח אותם במקומם', icon: '🍽️', defaultPoints: 10, frequency: 'DAILY', position: 1 },
      { key: 'niggub-avak', name: 'ניגוב אבק', description: 'נגב אבק מכל הרהיטים', icon: '🧹', defaultPoints: 10, frequency: 'WEEKLY', position: 2 },
      { key: 'sheiva-avak', name: 'שאיבת אבק', description: 'שאב אבק בכל החדרים', icon: '🧽', defaultPoints: 15, frequency: 'WEEKLY', position: 3 },
      { key: 'kvisa', name: 'כביסה', description: 'הכנס כביסה למכונה, ייבש וקפל', icon: '🧺', defaultPoints: 20, frequency: 'WEEKLY', position: 4 },
      { key: 'hotzoat-ashpa', name: 'הוצאת אשפה', description: 'רוקן את פחי הזבל והוצא לחוץ', icon: '🗑️', defaultPoints: 10, frequency: 'DAILY', position: 5 },
    ]
  },
  {
    key: 'hayyat-michmad',
    name: 'חיית מחמד',
    description: 'טיפול בחיות המחמד של המשפחה',
    icon: '🐾',
    color: '#F59E0B',
    position: 1,
    activities: [
      { key: 'haala-hayyat-michmad', name: 'האכלת חיית מחמד', description: 'תן אוכל ומים טריים לחיית המחמד', icon: '🐕', defaultPoints: 10, frequency: 'DAILY', position: 0 },
      { key: 'halicha-im-kelev', name: 'הליכה עם הכלב', description: 'קח את הכלב לטיול', icon: '🦮', defaultPoints: 20, frequency: 'DAILY', position: 1 },
      { key: 'nikion-argaz-khol', name: 'ניקיון ארגז חול', description: 'נקה את ארגז החול של החתול', icon: '🐈', defaultPoints: 10, frequency: 'DAILY', position: 2 },
      { key: 'sirug-parva', name: 'סירוק פרווה', description: 'סרק את פרוות חיית המחמד', icon: '🪮', defaultPoints: 10, frequency: 'WEEKLY', position: 3 },
    ]
  },
  {
    key: 'sport',
    name: 'ספורט',
    description: 'פעילות גופנית ואימונים',
    icon: '🏃',
    color: '#8B5CF6',
    position: 2,
    activities: [
      { key: 'imun-sport', name: 'אימון ספורט', description: '30 דקות של פעילות גופנית', icon: '💪', defaultPoints: 25, frequency: 'DAILY', position: 0 },
      { key: 'ritza', name: 'ריצה', description: 'צא לריצה של לפחות 20 דקות', icon: '🏃', defaultPoints: 20, frequency: 'DAILY', position: 1 },
      { key: 'rekhiva-ofanayim', name: 'רכיבה על אופניים', description: 'צא לסיבוב על האופניים', icon: '🚴', defaultPoints: 20, frequency: 'WEEKLY', position: 2 },
      { key: 'skhiya', name: 'שחייה', description: 'שחה לפחות 20 דקות בבריכה', icon: '🏊', defaultPoints: 25, frequency: 'WEEKLY', position: 3 },
      { key: 'kaduregel', name: 'כדורגל', description: 'שחק כדורגל עם חברים', icon: '⚽', defaultPoints: 20, frequency: 'WEEKLY', position: 4 },
    ]
  },
  {
    key: 'maasim-tovim',
    name: 'מעשים טובים',
    description: 'נקודות בונוס על מעשים טובים ועזרה',
    icon: '❤️',
    color: '#EC4899',
    position: 3,
    activities: [
      { key: 'ezra-lakh-akh', name: 'עזרה לאח/אחות', description: 'עזור לאחיך או אחותך במשהו', icon: '🤝', defaultPoints: 15, frequency: 'ANYTIME', position: 0 },
      { key: 'ezra-lahorim', name: 'עזרה להורים', description: 'עזור להורים ללא בקשה', icon: '🌟', defaultPoints: 20, frequency: 'ANYTIME', position: 1 },
      { key: 'toda-lamishehu', name: 'הודיה למישהו', description: 'תודה למישהו בכנות', icon: '💌', defaultPoints: 10, frequency: 'ANYTIME', position: 2 },
      { key: 'ezra-lishakhen', name: 'עזרה לשכן', description: 'עזור לשכן או לחבר', icon: '🏘️', defaultPoints: 15, frequency: 'ANYTIME', position: 3 },
      { key: 'peula-tova', name: 'פעולה טובה', description: 'עשה מעשה טוב ובלתי צפוי', icon: '✨', defaultPoints: 20, frequency: 'ANYTIME', position: 4 },
    ]
  }
]

/**
 * Seed a household with default categories and activities.
 * Uses unique keys scoped to the household to avoid conflicts.
 * @param lang - 'he' seeds Hebrew categories, anything else seeds English
 */
export async function seedHouseholdDefaults(prisma: PrismaClient, householdId: string, createdById: string, lang?: string) {
  const categories = lang === 'he' ? DEFAULT_CATEGORIES_HE : DEFAULT_CATEGORIES
  for (const cat of categories) {
    const scopedCatKey = `${householdId}_${cat.key}`

    const category = await prisma.category.create({
      data: {
        key: scopedCatKey,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        position: cat.position,
        isActive: true,
        householdId
      }
    })

    for (const act of cat.activities) {
      const scopedActKey = `${householdId}_${act.key}`
      await prisma.activity.create({
        data: {
          key: scopedActKey,
          categoryId: category.id,
          name: act.name,
          description: act.description,
          icon: act.icon,
          defaultPoints: act.defaultPoints,
          frequency: act.frequency,
          position: act.position,
          isActive: true,
          requiresNote: false,
          requiresPhoto: false,
          createdById
        }
      })
    }
  }
}
