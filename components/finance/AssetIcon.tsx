const ASSET_ICONS: Record<string, { icon: string; bg: string }> = {
  INVESTMENT: { icon: '📊', bg: '#ebf2ff' },
  SAVINGS: { icon: '🏦', bg: '#def7ec' },
  PENSION: { icon: '🛡️', bg: '#f3e8ff' },
  PROVIDENT: { icon: '💰', bg: '#fff7e6' },
  STUDY_FUND: { icon: '🎓', bg: '#fce7f3' },
  CHECKING: { icon: '💳', bg: '#f3f4f6' },
}

export const ASSET_COLORS: Record<string, string> = {
  INVESTMENT: '#1a56db',
  SAVINGS: '#0e9f6e',
  PENSION: '#7e3af2',
  PROVIDENT: '#ff8c00',
  STUDY_FUND: '#e74694',
  CHECKING: '#6b7280',
}

export default function AssetIcon({ type, size = 44 }: { type: string; size?: number }) {
  const cfg = ASSET_ICONS[type] ?? { icon: '💼', bg: '#f3f4f6' }
  return (
    <div
      className="fs-asset-icon"
      style={{ background: cfg.bg, width: size, height: size, fontSize: size * 0.45 }}
    >
      {cfg.icon}
    </div>
  )
}
