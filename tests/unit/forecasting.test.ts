import { describe, it, expect } from 'vitest'
import {
  runForecast,
  calculateGoalProgress,
  generateShortTermProjection,
} from '@/lib/finance/forecasting'

const baseAssets = [
  { type: 'PENSION', currentValue: 200000, monthlyDeposit: 1500, employerContribution: 2000, expectedReturnRate: 5.5 },
  { type: 'INVESTMENT', currentValue: 50000, monthlyDeposit: 1000, employerContribution: 0 },
  { type: 'SAVINGS', currentValue: 30000, monthlyDeposit: 500, employerContribution: 0, interestRate: 4 },
  { type: 'CHECKING', currentValue: 10000, monthlyDeposit: 0, employerContribution: 0 },
]

describe('runForecast', () => {
  it('returns a result with all required fields', () => {
    const result = runForecast({ currentAge: 40, retirementAge: 67, targetMonthlyIncome: 15000, assets: baseAssets })
    expect(result).toHaveProperty('totalCurrentValue')
    expect(result).toHaveProperty('projectedRetirementValue')
    expect(result).toHaveProperty('estimatedMonthlyIncome')
    expect(result).toHaveProperty('yearsToRetirement')
    expect(result).toHaveProperty('riskScore')
    expect(result).toHaveProperty('growthPoints')
    expect(result).toHaveProperty('goalGapAnalysis')
  })

  it('yearsToRetirement is retirementAge - currentAge', () => {
    const result = runForecast({ currentAge: 40, retirementAge: 67, assets: baseAssets })
    expect(result.yearsToRetirement).toBe(27)
  })

  it('projectedRetirementValue grows with more assets', () => {
    const small = runForecast({ currentAge: 40, retirementAge: 67, assets: [{ type: 'SAVINGS', currentValue: 1000, monthlyDeposit: 0, employerContribution: 0 }] })
    const large = runForecast({ currentAge: 40, retirementAge: 67, assets: baseAssets })
    expect(large.projectedRetirementValue).toBeGreaterThan(small.projectedRetirementValue)
  })

  it('is NOT onTrack when income falls short of target', () => {
    const result = runForecast({ currentAge: 60, retirementAge: 67, targetMonthlyIncome: 50000, assets: [{ type: 'SAVINGS', currentValue: 5000, monthlyDeposit: 0, employerContribution: 0 }] })
    expect(result.goalGapAnalysis.onTrack).toBe(false)
    expect(result.goalGapAnalysis.gap).toBeLessThan(0)
  })

  it('is onTrack when target is fully covered', () => {
    const result = runForecast({ currentAge: 30, retirementAge: 67, targetMonthlyIncome: 1000, assets: [{ type: 'INVESTMENT', currentValue: 10_000_000, monthlyDeposit: 10000, employerContribution: 5000 }] })
    expect(result.goalGapAnalysis.onTrack).toBe(true)
  })

  it('riskScore is between 0 and 100', () => {
    const result = runForecast({ currentAge: 40, retirementAge: 67, assets: baseAssets })
    expect(result.riskScore).toBeGreaterThanOrEqual(0)
    expect(result.riskScore).toBeLessThanOrEqual(100)
  })

  it('growthPoints is a non-empty array', () => {
    const result = runForecast({ currentAge: 40, retirementAge: 67, assets: baseAssets })
    expect(Array.isArray(result.growthPoints)).toBe(true)
    expect(result.growthPoints.length).toBeGreaterThan(0)
  })

  it('handles no assets gracefully', () => {
    const result = runForecast({ currentAge: 40, retirementAge: 67, assets: [] })
    expect(result.projectedRetirementValue).toBe(0)
    expect(result.totalCurrentValue).toBe(0)
    expect(result.goalGapAnalysis.onTrack).toBe(false)
  })

  it('uses custom expectedReturnRate when provided', () => {
    const low = runForecast({ currentAge: 40, retirementAge: 67, assets: [{ type: 'INVESTMENT', currentValue: 100000, monthlyDeposit: 0, employerContribution: 0, expectedReturnRate: 1 }] })
    const high = runForecast({ currentAge: 40, retirementAge: 67, assets: [{ type: 'INVESTMENT', currentValue: 100000, monthlyDeposit: 0, employerContribution: 0, expectedReturnRate: 15 }] })
    expect(high.projectedRetirementValue).toBeGreaterThan(low.projectedRetirementValue)
  })
})

describe('calculateGoalProgress', () => {
  it('returns progress percentage', () => {
    const result = calculateGoalProgress(100000, 50000)
    expect(result.percentage).toBe(50)
  })

  it('caps progress at 100%', () => {
    const result = calculateGoalProgress(100, 200)
    expect(result.percentage).toBe(100)
  })

  it('handles zero target gracefully', () => {
    const result = calculateGoalProgress(0, 0)
    expect(result.percentage).toBeGreaterThanOrEqual(0)
  })

  it('includes remaining amount', () => {
    const result = calculateGoalProgress(100000, 40000)
    expect(result.remaining).toBe(60000)
  })

  it('onTrack when at least 50% done', () => {
    expect(calculateGoalProgress(100, 50).onTrack).toBe(true)
    expect(calculateGoalProgress(100, 49).onTrack).toBe(false)
  })
})

describe('generateShortTermProjection', () => {
  it('returns horizon+1 data points (year 0 through horizon)', () => {
    const points = generateShortTermProjection(100000, 5, 500, 10)
    expect(points.length).toBe(11) // 0..10 inclusive
  })

  it('values increase over time with positive growth', () => {
    const points = generateShortTermProjection(100000, 8, 1000, 10)
    expect(points[10].value).toBeGreaterThan(points[0].value)
  })

  it('year 0 equals present value when no monthly payment', () => {
    const points = generateShortTermProjection(100000, 5, 0, 5)
    expect(points[0].value).toBe(100000)
  })
})
