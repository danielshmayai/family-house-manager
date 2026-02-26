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
  const { default: handler } = await import('@/pages/api/users')
  await handler(req as any, res as any)
  return { status: res._getStatusCode(), data: res._getJSONData() }
}

describe('GET /api/users', () => {
  it('returns users list without passwordHash', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'a@b.com', name: 'Alice', householdId: 'hh1', role: 'ADMIN' }
    ])
    const { status, data } = await callHandler('GET')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    // SECURITY: passwordHash must never be returned
    expect(data[0].passwordHash).toBeUndefined()
    expect(data[0].otpSecret).toBeUndefined()
  })

  it('filters by householdId', async () => {
    prismaMock.user.findMany.mockResolvedValue([])
    await callHandler('GET', { query: { householdId: 'hh1' } })
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { householdId: 'hh1' } })
    )
  })
})

describe('PUT /api/users', () => {
  it('requires id', async () => {
    const { status, data } = await callHandler('PUT', { body: { name: 'Alice' } })
    expect(status).toBe(400)
    expect(data.error).toMatch(/id required/i)
  })

  it('updates user fields', async () => {
    prismaMock.user.update.mockResolvedValue({ id: 'u1', name: 'Alice Updated', role: 'ADMIN', householdId: 'hh1' })
    const { status, data } = await callHandler('PUT', { body: { id: 'u1', name: 'Alice Updated' } })
    expect(status).toBe(200)
    expect(data.name).toBe('Alice Updated')
  })
})

describe('Method handling', () => {
  it('returns 405 for DELETE with JSON error body', async () => {
    const { status, data } = await callHandler('DELETE')
    expect(status).toBe(405)
    expect(data.error).toBeDefined()
  })
})
