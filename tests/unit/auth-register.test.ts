import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { createPrismaMock } from '../helpers/prisma-mock'

let prismaMock: ReturnType<typeof createPrismaMock>

vi.mock('@/lib/prisma', () => ({ default: {} }))
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed'), compare: vi.fn() } }))

beforeEach(async () => {
  prismaMock = createPrismaMock()
  const prismaModule = await import('@/lib/prisma')
  Object.assign(prismaModule.default, prismaMock)
  vi.clearAllMocks()
})

async function callHandler(body: object, method = 'POST') {
  const { req, res } = createMocks({ method, body })
  const { default: handler } = await import('@/pages/api/auth/register')
  await handler(req as any, res as any)
  return { status: res._getStatusCode(), data: res._getJSONData() }
}

describe('POST /api/auth/register', () => {
  it('rejects non-POST methods', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    const { default: handler } = await import('@/pages/api/auth/register')
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })

  it('requires email and password', async () => {
    const { status, data } = await callHandler({ name: 'Alice' })
    expect(status).toBe(400)
    expect(data.error).toMatch(/email and password/i)
  })

  it('requires name of at least 2 characters', async () => {
    const { status, data } = await callHandler({ email: 'a@b.com', password: 'pass123', name: 'A' })
    expect(status).toBe(400)
    expect(data.error).toMatch(/name/i)
  })

  it('rejects duplicate email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing', email: 'a@b.com' })
    const { status, data } = await callHandler({ email: 'a@b.com', password: 'pass123', name: 'Alice' })
    expect(status).toBe(400)
    expect(data.error).toMatch(/already exists/i)
  })

  it('creates user and household (Path B - no invite code)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Alice', passwordHash: 'hashed', role: 'ADMIN' })
    prismaMock.household.create.mockResolvedValue({ id: 'hh1', name: "Alice's Family" })
    prismaMock.user.update.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Alice', householdId: 'hh1', role: 'ADMIN' })

    const { status, data } = await callHandler({ email: 'a@b.com', password: 'pass123', name: 'Alice' })
    expect(status).toBe(200)
    expect(data.id).toBe('u1')
    expect(data.householdId).toBe('hh1')
    expect(data.role).toBe('ADMIN')
  })

  it('does NOT return passwordHash in response', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Alice', passwordHash: 'hashed', role: 'ADMIN' })
    prismaMock.household.create.mockResolvedValue({ id: 'hh1', name: "Alice's Family" })
    prismaMock.user.update.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Alice', householdId: 'hh1', role: 'ADMIN' })

    const { data } = await callHandler({ email: 'a@b.com', password: 'pass123', name: 'Alice' })
    expect(data.passwordHash).toBeUndefined()
  })

  it('joins household with valid invite code (Path A)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.invite.findUnique.mockResolvedValue({ id: 'inv1', code: 'ABCD1234', householdId: 'hh1', usedById: null, expiresAt: null })
    prismaMock.user.create.mockResolvedValue({ id: 'u2', email: 'b@b.com', name: 'Bob', householdId: 'hh1', role: 'MEMBER' })
    prismaMock.invite.update.mockResolvedValue({})

    const { status, data } = await callHandler({ email: 'b@b.com', password: 'pass123', name: 'Bob', inviteCode: 'abcd1234' })
    expect(status).toBe(200)
    expect(data.householdId).toBe('hh1')
    expect(data.role).toBe('MEMBER')
    expect(prismaMock.invite.update).toHaveBeenCalledWith({ where: { id: 'inv1' }, data: { usedById: 'u2' } })
  })

  it('rejects already-used invite code', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.invite.findUnique.mockResolvedValue({ id: 'inv1', code: 'USED1234', usedById: 'someone', expiresAt: null })

    const { status, data } = await callHandler({ email: 'c@c.com', password: 'pass123', name: 'Carol', inviteCode: 'used1234' })
    expect(status).toBe(400)
    expect(data.error).toMatch(/already been used/i)
  })

  it('rejects expired invite code', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.invite.findUnique.mockResolvedValue({ id: 'inv2', code: 'EXP01234', usedById: null, expiresAt: new Date(Date.now() - 1000) })

    const { status, data } = await callHandler({ email: 'd@d.com', password: 'pass123', name: 'Dave', inviteCode: 'exp01234' })
    expect(status).toBe(400)
    expect(data.error).toMatch(/expired/i)
  })

  it('rejects invalid invite code', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.invite.findUnique.mockResolvedValue(null)

    const { status, data } = await callHandler({ email: 'e@e.com', password: 'pass123', name: 'Eve', inviteCode: 'BADCODE' })
    expect(status).toBe(400)
    expect(data.error).toMatch(/invalid/i)
  })
})
