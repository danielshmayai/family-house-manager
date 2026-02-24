'use client'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { formatCurrency, Lang } from '@/lib/finance/i18n'
import { ASSET_COLORS } from './AssetIcon'

interface TrendPoint { year: number; value: number; label: string }

interface TrendChartProps {
  data: TrendPoint[]
  lang: Lang
  color?: string
}

export function TrendChart({ data, lang, color = '#1a56db' }: TrendChartProps) {
  if (!data?.length) return null
  return (
    <div className="fs-chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip
            formatter={(val: any) => [formatCurrency(val as number, 'ILS', lang), '']}
            contentStyle={{
              borderRadius: 10, border: '1px solid #e5e7eb',
              fontSize: 12, fontFamily: 'inherit',
            }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#colorVal)"
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface AllocationData { name: string; value: number; type: string }

interface PieProps {
  data: AllocationData[]
  lang: Lang
}

const RADIAN = Math.PI / 180
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function AllocationPie({ data, lang }: PieProps) {
  if (!data?.length) return null
  return (
    <div className="fs-chart-wrap" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            {data.map((entry, index) => (
              <Cell key={entry.type} fill={ASSET_COLORS[entry.type] ?? '#9ca3af'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val: any) => [formatCurrency(val as number, 'ILS', lang), '']}
            contentStyle={{ borderRadius: 10, fontSize: 12 }}
          />
          <Legend
            formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
