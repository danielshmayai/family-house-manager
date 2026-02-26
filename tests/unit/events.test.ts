import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { createPrismaMock } from '../helpers/prisma-mock'

let prismaMock: ReturnType<typeof createPrismaMock>

vi.mock('@/lib/prisma', () => ({ default: {} }))

beforeEach(async () => {
  prismaMock = createPrismaMock()
  const prismaModule = await import('@/lib/prisma')
  Object.assign(prismaModule.default, prismaMock)
  vi.clearAllMocks()
})

async function callHandler(method: string, opts: { query?: any; body?: any } = {}) {
  const { req, res } = createMocks({ method, query: opts.query ?? {}, body: opts.body ?? {} })
  const { default: handler } = await import('@/pages/api/events')
  await handler(req as any, res as any)
  return { status: res._getStatusCode(), data: res._getJSONData() }
}

const mockUser = { id: 'u1', email: 'a@b.com', name: 'Alice', householdId: 'hh1', role: 'MEMBER' }
const mockHousehold = { id: 'hh1', name: "Alice's Family" }
const mockActivity = { id: 'act1', name: 'Cook dinner', frequency: 'DAILY', defaultPoints: 20, isActive: true }

describe('POST /api/events', () => {
  it('requires eventType and recordedById', async () => {
    const { status, data } = await callHandler('POST', { body: {} })
    expect(status).toBe(400)
    expect(data.error).toMatch(/eventType and recordedById/i)
  })

  it('rejects invalid recordedById', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    const { status, data } = await callHandler('POST', { body: { eventType: 'TASK_COMPLETED', recordedById: 'bad-id' } })
    expect(status).toBe(400)
    expect(data.error).toMatch(/invalid recordedById/i)
  })

  it('rejects when user has no household and none is provided', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, householdId: null })
    const { status, data } = await callHandler('POST', { body: { eventType: 'TASK_COMPLETED', recordedById: 'u1' } })
    expect(status).toBe(400)
    expect(data.error).toMatch(/no householdId/i)
  })

  it('creates event using user householdId when payload has none', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
    prismaMock.event.create.mockResolvedValue({ id: 'ev1', eventType: 'TASK_COMPLETED', recordedById: 'u1', householdId: 'hh1', points: 0, activity: null })

    const { status, data } = await callHandler('POST', { body: { eventType: 'TASK_COMPLETED', recordedById: 'u1' } })
    expect(status).toBe(200)
    expect(data.id).toBe('ev1')
  })

  it('rejects invalid householdId in payload', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
    prismaMock.household.findUnique.mockResolvedValue(null)

    const { status, data } = await callHandler('POST', { body: { eventType: 'TASK_COMPLETED', recordedById: 'u1', householdId: 'bad-hh' } })
    expect(status).toBe(400)
    expect(data.error).toMatch(/invalid householdId/i)
  })

  it('rejects invalid activityId', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
    prismaMock.activity.findUnique.mockResolvedValue(null)

    const { status, data } = await callHandler('POST', { body: { eventType: 'TASK_COMPLETED', recordedById: 'u1', activityId: 'bad-act' } })
    expect(status).toBe(400)
    expect(data.error).toMatch(/invalid activityId/i)
  })

  it('prevents completing a DAILY activity twice in one day', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
    prismaMock.activity.findUnique.mockResolvedValue({ ...mockActivity, frequency: 'DAILY' })
    prismaMock.event.findFirst.mockResolvedValue({ id: 'ev-existing' }) // already completed

    const { status, data } = await callHandler('POST', { body: { eventType: 'TASK_COMPLETED', recordedById: 'u1', activityId: 'act1' } })
    expect(status).toBe(409)
    expect(data.error).toMatch(/already completed/i)
  })

  it('creates event with activity points', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
    prismaMock.activity.findUnique.mockResolvedValue({ ...mockActivity, frequency: 'DAILY' })
    prismaMock.event.findFirst.mockResolvedValue(null)
    prismaMock.event.create.mockResolvedValue({ id: 'ev2', eventType: 'TASK_COMPLETED', recordedById: 'u1', householdId: 'hh1', points: 20, activity: mockActivity })

    const { status, data } = await callHandler('POST', { body: { eventType: 'TASK_COMPLETED', recordedById: 'u1', activityId: 'act1' } })
    expect(status).toBe(200)
    expect(data.points).toBe(20)
  })

  it('stores metadata as JSON string', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
    prismaMock.event.create.mockResolvedValue({ id: 'ev3', eventType: 'TASK_COMPLETED', recordedById: 'u1', householdId: 'hh1', points: 0, activity: null })

    await callHandler('POST', { body: { eventType: 'TASK_COMPLETED', recordedById: 'u1', meta: { key: 'val' } } })
    const callArg = prismaMock.event.create.mock.calls[0][0]
    expect(callArg.data.metadata).toBe('{"key":"val"}')
  })
})

describe('GET /api/events', () => {
  it('returns events list', async () => {
    prismaMock.event.findMany.mockResolvedValue([{ id: 'ev1', eventType: 'TASK_COMPLETED', activity: null }])
    const { status, data } = await callHandler('GET')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })

  it('filters by householdId', async () => {
    prismaMock.event.findMany.mockResolvedValue([])
    await callHandler('GET', { query: { householdId: 'hh1' } })
    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ householdId: 'hh1' }) })
    )
  })
})

describe('DELETE /api/events', () => {
  it('requires id', async () => {
    const { status, data } = await callHandler('DELETE', { query: {} })
    expect(status).toBe(400)
    expect(data.error).toMatch(/id is required/i)
  })

  it('returns 404 for non-existent event', async () => {
    prismaMock.event.findUnique.mockResolvedValue(null)
    const { status } = await callHandler('DELETE', { query: { id: 'ev-bad' } })
    expect(status).toBe(404)
  })

  it('deletes event and returns reverted info', async () => {
    const mockEvent = { id: 'ev1', eventType: 'TASK_COMPLETED', points: 20, activity: { id: 'act1', name: 'Cook dinner', icon: '🍳', defaultPoints: 20 }, recordedBy: { id: 'u1', name: 'Alice' } }
    prismaMock.event.findUnique.mockResolvedValue(mockEvent)
    prismaMock.event.delete.mockResolvedValue({})

    const { status, data } = await callHandler('DELETE', { query: { id: 'ev1' } })
    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.reverted.pointsReverted).toBe(20)
    expect(data.reverted.activityName).toBe('Cook dinner')
  })
})

describe('GET /api/events/today', () => {
  it('returns today events', async () => {
    const { req, res } = createMocks({ method: 'GET', query: {} })
    const { default: todayHandler } = await import('@/pages/api/events/today')
    prismaMock.event.findMany.mockResolvedValue([{ id: 'ev1', eventType: 'TASK_COMPLETED', activity: null, recordedBy: { id: 'u1', name: 'Alice', email: 'a@b.com' } }])
    await todayHandler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    const data = res._getJSONData()
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].recordedByName).toBe('Alice')
  })
})
