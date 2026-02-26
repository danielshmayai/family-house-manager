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
  const { default: handler } = await import('@/pages/api/categories')
  await handler(req as any, res as any)
  return { status: res._getStatusCode(), data: res._getJSONData() }
}

const mockCategory = { id: 'cat1', key: 'cooking', name: 'Cooking', description: null, icon: '🍳', color: null, position: 0, isActive: true, householdId: null, activities: [] }

describe('GET /api/categories', () => {
  it('returns list of active categories', async () => {
    prismaMock.category.findMany.mockResolvedValue([mockCategory])
    const { status, data } = await callHandler('GET')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].name).toBe('Cooking')
  })

  it('returns single category when id is provided', async () => {
    prismaMock.category.findUnique.mockResolvedValue(mockCategory)
    const { status, data } = await callHandler('GET', { query: { id: 'cat1' } })
    expect(status).toBe(200)
    expect(data.id).toBe('cat1')
  })

  it('filters by householdId when provided', async () => {
    prismaMock.category.findMany.mockResolvedValue([])
    await callHandler('GET', { query: { householdId: 'hh1' } })
    expect(prismaMock.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ householdId: 'hh1' }) })
    )
  })
})

describe('POST /api/categories', () => {
  it('creates category with name', async () => {
    prismaMock.category.create.mockResolvedValue({ ...mockCategory, id: 'cat2', name: 'Cleaning' })
    const { status, data } = await callHandler('POST', { body: { name: 'Cleaning' } })
    expect(status).toBe(200)
    expect(data.name).toBe('Cleaning')
  })

  it('requires name', async () => {
    const { status, data } = await callHandler('POST', { body: {} })
    expect(status).toBe(400)
    expect(data.error).toMatch(/name/i)
  })

  it('auto-generates key if not provided', async () => {
    prismaMock.category.create.mockResolvedValue({ ...mockCategory, key: 'category_12345' })
    await callHandler('POST', { body: { name: 'Exercise' } })
    const callArg = prismaMock.category.create.mock.calls[0][0]
    expect(callArg.data.key).toMatch(/^category_/)
  })
})

describe('PUT /api/categories', () => {
  it('updates category by id from body', async () => {
    prismaMock.category.update.mockResolvedValue({ ...mockCategory, name: 'Updated' })
    const { status, data } = await callHandler('PUT', { body: { id: 'cat1', name: 'Updated' } })
    expect(status).toBe(200)
    expect(data.name).toBe('Updated')
  })

  it('returns 400 when id is missing', async () => {
    const { status, data } = await callHandler('PUT', { body: { name: 'No ID' } })
    expect(status).toBe(400)
    expect(data.error).toMatch(/missing id/i)
  })
})

describe('DELETE /api/categories', () => {
  it('deletes category and cascades activities and events', async () => {
    prismaMock.activity.findMany.mockResolvedValue([{ id: 'act1' }, { id: 'act2' }])
    prismaMock.event.deleteMany.mockResolvedValue({ count: 3 })
    prismaMock.activity.deleteMany.mockResolvedValue({ count: 2 })
    prismaMock.category.delete.mockResolvedValue({})

    const { status, data } = await callHandler('DELETE', { query: { id: 'cat1' } })
    expect(status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.cascaded.activitiesDeleted).toBe(2)
    expect(data.cascaded.eventsDeleted).toBe(3)
  })

  it('returns 400 when id is missing', async () => {
    const { status, data } = await callHandler('DELETE', { query: {} })
    expect(status).toBe(400)
    expect(data.error).toMatch(/missing id/i)
  })
})

describe('Method handling', () => {
  it('PATCH without id returns 400 (handled by PUT/PATCH block)', async () => {
    // PATCH is handled by the PUT||PATCH block; missing id → 400
    const { status, data } = await callHandler('PATCH', { body: {} })
    expect(status).toBe(400)
    expect(data.error).toMatch(/missing id/i)
  })
})
