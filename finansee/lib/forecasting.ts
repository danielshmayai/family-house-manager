// Financial forecasting engine

export interface ForecastInput {
  currentAge: number
  retirementAge: number
  assets: {
    type: string
    currentValue: number
    monthlyDeposit?: number
    employerContribution?: number
    expectedReturnRate?: number
    interestRate?: number
    maturityDate?: string
  }[]
  targetMonthlyIncome?: number
}

export interface GrowthPoint {
  year: number
  value: number
  label: string
}

export interface ForecastResult {
  totalCurrentValue: number
  projectedRetirementValue: number
  estimatedMonthlyIncome: number
  yearsToRetirement: number
  projectedRetirementAge: number
  growthPoints: GrowthPoint[]
  riskScore: number
  riskLabel: 'low' | 'medium' | 'high'
  goalGapAnalysis: {
    targetMonthlyIncome: number
    estimatedMonthlyIncome: number
    gap: number
    onTrack: boolean
  }
}

function futureValue(
  presentValue: number,
  annualRate: number,
  years: number,
  monthlyPayment: number = 0
): number {
  const r = annualRate / 100 / 12
  const n = years * 12
  if (r === 0) return presentValue + monthlyPayment * n
  const fv = presentValue * Math.pow(1 + r, n) + monthlyPayment * ((Math.pow(1 + r, n) - 1) / r)
  return Math.max(0, fv)
}

function calculateRiskScore(assets: ForecastInput['assets']): number {
  const total = assets.reduce((sum, a) => sum + a.currentValue, 0)
  if (total === 0) return 0

  let weightedRisk = 0
  for (const asset of assets) {
    const weight = asset.currentValue / total
    let riskFactor = 0
    switch (asset.type) {
      case 'INVESTMENT': riskFactor = 80; break
      case 'SAVINGS': riskFactor = 10; break
      case 'PENSION': riskFactor = 30; break
      case 'PROVIDENT': riskFactor = 35; break
      case 'STUDY_FUND': riskFactor = 40; break
      case 'CHECKING': riskFactor = 5; break
      default: riskFactor = 20
    }
    weightedRisk += weight * riskFactor
  }
  return Math.round(weightedRisk)
}

export function runForecast(input: ForecastInput): ForecastResult {
  const { currentAge, retirementAge, assets, targetMonthlyIncome = 15000 } = input
  const yearsToRetirement = Math.max(0, retirementAge - currentAge)
  const totalCurrentValue = assets.reduce((sum, a) => sum + a.currentValue, 0)

  let projectedRetirementValue = 0
  for (const asset of assets) {
    const rate = asset.expectedReturnRate ?? asset.interestRate ?? getDefaultRate(asset.type)
    const monthly = (asset.monthlyDeposit ?? 0) + (asset.employerContribution ?? 0)
    projectedRetirementValue += futureValue(asset.currentValue, rate, yearsToRetirement, monthly)
  }

  const estimatedMonthlyIncome = (projectedRetirementValue * 0.04) / 12

  const growthPoints: GrowthPoint[] = []
  const currentYear = new Date().getFullYear()
  for (let yr = 0; yr <= Math.min(yearsToRetirement, 40); yr++) {
    let valueAtYear = 0
    for (const asset of assets) {
      const rate = asset.expectedReturnRate ?? asset.interestRate ?? getDefaultRate(asset.type)
      const monthly = (asset.monthlyDeposit ?? 0) + (asset.employerContribution ?? 0)
      valueAtYear += futureValue(asset.currentValue, rate, yr, monthly)
    }
    growthPoints.push({
      year: currentYear + yr,
      value: Math.round(valueAtYear),
      label: `${currentYear + yr}`,
    })
  }

  const riskScore = calculateRiskScore(assets)
  const riskLabel: 'low' | 'medium' | 'high' =
    riskScore < 30 ? 'low' : riskScore < 60 ? 'medium' : 'high'

  return {
    totalCurrentValue,
    projectedRetirementValue: Math.round(projectedRetirementValue),
    estimatedMonthlyIncome: Math.round(estimatedMonthlyIncome),
    yearsToRetirement,
    projectedRetirementAge: retirementAge,
    growthPoints,
    riskScore,
    riskLabel,
    goalGapAnalysis: {
      targetMonthlyIncome,
      estimatedMonthlyIncome: Math.round(estimatedMonthlyIncome),
      gap: Math.round(estimatedMonthlyIncome - targetMonthlyIncome),
      onTrack: estimatedMonthlyIncome >= targetMonthlyIncome,
    },
  }
}

function getDefaultRate(type: string): number {
  switch (type) {
    case 'INVESTMENT': return 8
    case 'SAVINGS': return 4
    case 'PENSION': return 5.5
    case 'PROVIDENT': return 5
    case 'STUDY_FUND': return 5.5
    case 'CHECKING': return 0.5
    default: return 4
  }
}

export function calculateGoalProgress(targetAmount: number, currentAmount: number) {
  const percentage = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0
  return {
    percentage: Math.round(percentage * 10) / 10,
    remaining: Math.max(0, targetAmount - currentAmount),
    onTrack: percentage >= 50,
  }
}

export function generateShortTermProjection(
  currentValue: number,
  rate: number,
  monthlyPayment: number,
  horizon: number = 10
): GrowthPoint[] {
  const currentYear = new Date().getFullYear()
  const points: GrowthPoint[] = []
  for (let yr = 0; yr <= horizon; yr++) {
    points.push({
      year: currentYear + yr,
      value: Math.round(futureValue(currentValue, rate, yr, monthlyPayment)),
      label: `${currentYear + yr}`,
    })
  }
  return points
}
