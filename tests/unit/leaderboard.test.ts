import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { createPrismaMock } from '../helpers/prisma-mock'

let prismaMock: ReturnType<typeof createPrismaMock>

vi.mock('@/lib/prisma', () => ({ default: {} }))
vi.mock('@/lib/rulesEngine', () => ({
  computePointsFromEvents: vi.fn().mockReturnValue({ points: 50, activitiesCount: 3, breakdown: [] }),
  computeStreakForUser: vi.fn().mockResolvedValue(0),
}))

beforeEach(async () => {
  prismaMock = createPrismaMock()
  const prismaModule = await import('@/lib/prisma')
  Object.assign(prismaModule.default, prismaMock)
  vi.clearAllMocks()
})

async function callHandler(query: any = {}) {
  const { req, res } = createMocks({ method: 'GET', query })
  const { default: handler } = await import('@/pages/api/leaderboard')
  await handler(req as any, res as any)
  return { status: res._getStatusCode(), data: res._getJSONData() }
}

describe('GET /api/leaderboard', () => {
  it('requires householdId', async () => {
    const { status, data } = await callHandler({})
    expect(status).toBe(400)
    expect(data.error).toMatch(/householdId required/i)
  })

  it('returns results and familyTotal', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'Alice', email: 'a@b.com' },
      { id: 'u2', name: 'Bob', email: 'b@b.com' },
    ])
    prismaMock.event.findMany.mockResolvedValue([])

    const { status, data } = await callHandler({ householdId: 'hh1' })
    expect(status).toBe(200)
    expect(Array.isArray(data.results)).toBe(true)
    expect(data.results.length).toBe(2)
    expect(typeof data.familyTotal).toBe('number')
    expect(data.familyTotal).toBe(100) // 50 per user × 2
  })

  it('sorts results by points descending', async () => {
    const { computePointsFromEvents } = await import('@/lib/rulesEngine')
    const mock = vi.mocked(computePointsFromEvents)
    mock.mockReturnValueOnce({ userId: 'u1', points: 10, activitiesCount: 1, breakdown: [] })
    mock.mockReturnValueOnce({ userId: 'u2', points: 80, activitiesCount: 5, breakdown: [] })

    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'Alice', email: 'a@b.com' },
      { id: 'u2', name: 'Bob', email: 'b@b.com' },
    ])
    prismaMock.event.findMany.mockResolvedValue([])

    const { data } = await callHandler({ householdId: 'hh1' })
    expect(data.results[0].points).toBeGreaterThanOrEqual(data.results[1].points)
  })

  it('returns empty results for household with no members', async () => {
    prismaMock.user.findMany.mockResolvedValue([])
    prismaMock.event.findMany.mockResolvedValue([])
    const { status, data } = await callHandler({ householdId: 'hh-empty' })
    expect(status).toBe(200)
    expect(data.results).toHaveLength(0)
    expect(data.familyTotal).toBe(0)
  })

  it('accepts range=daily parameter', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'u1', name: 'Alice', email: 'a@b.com' }])
    prismaMock.event.findMany.mockResolvedValue([])
    const { status } = await callHandler({ householdId: 'hh1', range: 'daily' })
    expect(status).toBe(200)
  })

  it('fetches all events without date filter for range=all-time', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'u1', name: 'Alice', email: 'a@b.com' }])
    prismaMock.event.findMany.mockResolvedValue([])
    await callHandler({ householdId: 'hh1', range: 'all-time' })
    // For all-time, event.findMany must be called without occurredAt filter
    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { householdId: 'hh1' } })
    )
  })
})
