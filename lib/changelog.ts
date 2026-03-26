export type ChangeType = 'new' | 'improved' | 'fix'

export type ChangeEntry = {
  type: ChangeType
  en: string
  he: string
}

export type ChangelogVersion = {
  version: string
  date: string
  changes: ChangeEntry[]
}

export const CHANGELOG: ChangelogVersion[] = [
  {
    version: '1.3.0',
    date: '2026-03-27',
    changes: [
      { type: 'new',      en: 'Welcome guide — tap ❓ on the home screen for a step-by-step walkthrough of the app', he: 'מדריך ברוך הבא — הקישו על ❓ במסך הבית לסיור שלב-אחר-שלב באפליקציה' },
      { type: 'fix',      en: 'Categories and activities with a custom photo now show correctly in all dropdowns', he: 'קטגוריות ופעילויות עם תמונה מותאמת מוצגות כעת נכון בכל התפריטים' },
      { type: 'fix',      en: 'Custom photos on categories now display properly in the history and task views',    he: 'תמונות מותאמות על קטגוריות מוצגות כעת כראוי בהיסטוריה ובמשימות' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-03-20',
    changes: [
      { type: 'new',      en: 'Tasks — you can now assign chores and activities to family members and track who did what', he: 'משימות — ניתן כעת להקצות מטלות ופעילויות לבני המשפחה ולעקוב אחריהן' },
      { type: 'new',      en: 'What\'s New — stay up to date with the latest improvements',   he: '"מה חדש" — הישארו מעודכנים בשיפורים האחרונים' },
      { type: 'improved', en: 'Activities load faster when you open the home screen',          he: 'הפעילויות נטענות מהר יותר בפתיחת מסך הבית' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-02-15',
    changes: [
      { type: 'new',      en: 'Two-factor authentication (OTP) support',          he: 'תמיכה באימות דו-שלבי (OTP)' },
      { type: 'new',      en: 'Password reset via email',                          he: 'איפוס סיסמה באמצעות אימייל' },
      { type: 'improved', en: 'Hebrew RTL layout improvements throughout the app', he: 'שיפורי פריסת RTL בעברית בכל האפליקציה' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-01-01',
    changes: [
      { type: 'new', en: 'Family household management',                         he: 'ניהול משק בית משפחתי' },
      { type: 'new', en: 'Points & leaderboard system',                         he: 'מערכת נקודות ולוח מובילים' },
      { type: 'new', en: 'Activity categories with daily tracking',             he: 'קטגוריות פעילויות עם מעקב יומי' },
      { type: 'new', en: 'Bilingual support — English and Hebrew',              he: 'תמיכה דו-לשונית — אנגלית ועברית' },
    ],
  },
]

export const LATEST_VERSION = CHANGELOG[0].version

export const WHATS_NEW_STORAGE_KEY = 'whatsNewLastSeen'
