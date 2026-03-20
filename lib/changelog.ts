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
    version: '1.2.0',
    date: '2026-03-20',
    changes: [
      { type: 'new',      en: 'Tasks system — assign and track tasks between family members', he: 'מערכת משימות — הקצאה ומעקב אחר משימות בין בני המשפחה' },
      { type: 'new',      en: '"What\'s New" — you\'re looking at it!',                       he: '"מה חדש" — אתם צופים בזה עכשיו!' },
      { type: 'improved', en: 'Faster activity loading on the home screen',                   he: 'טעינה מהירה יותר של פעילויות במסך הבית' },
      { type: 'fix',      en: 'Fixed migration issue that could block deployments',            he: 'תיקון בעיית מיגרציה שיכלה לחסום עדכונים' },
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
