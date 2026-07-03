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
    version: '2.0.0',
    date: '2026-07-03',
    changes: [
      { type: 'new',      en: 'Fresh design — new font, one clean look on every screen, and a simpler 5-tab navigation with a More tab for management tools and settings', he: 'עיצוב מחודש — פונט חדש, מראה אחיד בכל המסכים וניווט פשוט של 5 לשוניות עם לשונית "עוד" לכלי ניהול והגדרות' },
      { type: 'new',      en: 'Request money — members can ask for money from their wallet; the manager approves or denies with one tap', he: 'בקשת כסף — חברי משפחה יכולים לבקש כסף מהארנק; המנהל מאשר או דוחה בלחיצה אחת' },
      { type: 'new',      en: 'Recurring payments — set an automatic weekly or monthly allowance for any family member', he: 'תשלומים קבועים — קבעו דמי כיס אוטומטיים, שבועיים או חודשיים, לכל בן משפחה' },
      { type: 'new',      en: 'Tap a member in the wallet to see their balance and full money history — copy or share it straight to WhatsApp', he: 'הקישו על בן משפחה בארנק לצפייה ביתרה ובהיסטוריית הכסף המלאה — העתיקו או שתפו ישירות לוואטסאפ' },
      { type: 'new',      en: 'Minimum points for conversion (manager-configurable) and support for negative balances with transaction undo', he: 'מינימום נקודות להמרה (בקביעת המנהל) ותמיכה ביתרה שלילית עם ביטול עסקאות' },
      { type: 'improved', en: 'Wallet opens to what matters: balance, pending requests, family list and recent activity — everything else is one tap away', he: 'הארנק נפתח למה שחשוב: יתרה, בקשות ממתינות, רשימת המשפחה ופעילות אחרונה — כל השאר במרחק הקשה אחת' },
      { type: 'improved', en: 'All confirmations now use polished in-app dialogs instead of browser popups', he: 'כל האישורים משתמשים כעת בחלונות מעוצבים בתוך האפליקציה במקום חלונות דפדפן' },
      { type: 'fix',      en: 'All times now display in Israel time', he: 'כל השעות מוצגות כעת לפי שעון ישראל' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-03-28',
    changes: [
      { type: 'new',      en: 'Wallet — each member has a personal wallet; earn points and convert them to ₪ with a coin animation', he: 'ארנק — לכל חבר ארנק אישי; צברו נקודות והמירו אותן לשקלים עם אנימציית מטבעות' },
      { type: 'new',      en: 'Managers can credit or debit any member\'s wallet balance directly', he: 'מנהלים יכולים להוסיף או להפחית יתרה מהארנק של כל חבר' },
      { type: 'new',      en: 'Custom task points — managers can set a point reward on any task not linked to an activity', he: 'נקודות מותאמות למשימה — מנהלים יכולים לקבוע כמות נקודות לכל משימה שאינה קשורה לפעילות' },
      { type: 'improved', en: 'Bottom navigation is now always visible on every page with an active-page indicator', he: 'תפריט הניווט התחתון מוצג כעת תמיד בכל הדפים עם סימון הדף הפעיל' },
    ],
  },
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
