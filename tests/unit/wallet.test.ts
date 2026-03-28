import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { createPrismaMock } from '../helpers/prisma-mock'

let prismaMock: ReturnType<typeof createPrismaMock>

vi.mock('@/lib/prisma', () => ({ default: {} }))
vi.mock('@/lib/apiAuth', () => ({
  getSessionUser: vi.fn(),
  verifyHouseholdAccess: vi.fn(),
  isManager: (role: string) => role === 'ADMIN' || role === 'MANAGER',
}))

import { getSessionUser, verifyHouseholdAccess } from '@/lib/apiAuth'
const mockGetSessionUser = getSessionUser as ReturnType<typeof vi.fn>
const mockVerifyAccess = verifyHouseholdAccess as ReturnType<typeof vi.fn>

const MEMBER  = { id: 'u1', email: 'alice@x.com', name: 'Alice', householdId: 'hh1', role: 'MEMBER' }
const MANAGER = { id: 'u2', email: 'bob@x.com',   name: 'Bob',   householdId: 'hh1', role: 'ADMIN'  }

const baseWallet = { id: 'w1', userId: 'u1', balance: 25.50, createdAt: new Date(), updatedAt: new Date(), transactions: [] }

beforeEach(async () => {
  prismaMock = createPrismaMock()
  const prismaModule = await import('@/lib/prisma')
  Object.assign(prismaModule.default, prismaMock)
  vi.clearAllMocks()
  mockVerifyAccess.mockResolvedValue(true)
})

function safeJson(res: any) {
  try { return res._getJSONData() } catch { return null }
}

async function callWallet(method: string, opts: { query?: any; body?: any } = {}) {
  const { req, res } = createMocks({ method: method as any, query: opts.query ?? {}, body: opts.body ?? {} })
  const { default: handler } = await import('@/pages/api/wallet')
  await handler(req as any, res as any)
  return { status: res._getStatusCode(), data: safeJson(res) }
}

async function callConvert(body: any = {}) {
  const { req, res } = createMocks({ method: 'POST', body })
  const { default: handler } = await import('@/pages/api/wallet/convert')
  await handler(req as any, res as any)
  return { status: res._getStatusCode(), data: safeJson(res) }
}

async function callWalletRate(method: string, body: any = {}) {
  const { req, res } = createMocks({ method: method as any, body })
  const { default: handler } = await import('@/pages/api/household/wallet-rate')
  await handler(req as any, res as any)
  return { status: res._getStatusCode(), data: safeJson(res) }
}

// ── GET /api/wallet ───────────────────────────────────────────────────────────

describe('GET /api/wallet', () => {
  it('returns 401 when not logged in', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const { status } = await callWallet('GET')
    expect(status).toBe(401)
  })

  it('returns own wallet for member', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', householdId: 'hh1' })
    prismaMock.wallet.upsert.mockResolvedValue(baseWallet)
    prismaMock.event.aggregate.mockResolvedValue({ _sum: { points: 100 } })
    prismaMock.walletTransaction.aggregate.mockResolvedValue({ _sum: { pointsUsed: 0 } })
    const { status, data } = await callWallet('GET')
    expect(status).toBe(200)
    expect(data.balance).toBe(25.50)
  })

  it('forbids member from viewing another member wallet', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    const { status } = await callWallet('GET', { query: { userId: 'u99' } })
    expect(status).toBe(403)
  })

  it('allows manager to view any member wallet', async () => {
    mockGetSessionUser.mockResolvedValue(MANAGER)
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', householdId: 'hh1' })
    prismaMock.wallet.upsert.mockResolvedValue(baseWallet)
    prismaMock.event.aggregate.mockResolvedValue({ _sum: { points: 100 } })
    prismaMock.walletTransaction.aggregate.mockResolvedValue({ _sum: { pointsUsed: 0 } })
    const { status } = await callWallet('GET', { query: { userId: 'u1' } })
    expect(status).toBe(200)
  })
})

// ── POST /api/wallet (manager adjust) ────────────────────────────────────────

describe('POST /api/wallet', () => {
  it('returns 403 when member tries to adjust', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    const { status } = await callWallet('POST', { body: { userId: 'u1', amount: 10, type: 'CREDIT' } })
    expect(status).toBe(403)
  })

  it('returns 400 when required fields missing', async () => {
    mockGetSessionUser.mockResolvedValue(MANAGER)
    const { status } = await callWallet('POST', { body: { userId: 'u1' } })
    expect(status).toBe(400)
  })

  it('returns 400 for invalid type', async () => {
    mockGetSessionUser.mockResolvedValue(MANAGER)
    const { status } = await callWallet('POST', { body: { userId: 'u1', amount: 10, type: 'INVALID' } })
    expect(status).toBe(400)
  })

  it('manager can credit a wallet', async () => {
    mockGetSessionUser.mockResolvedValue(MANAGER)
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', householdId: 'hh1' })
    prismaMock.wallet.upsert.mockResolvedValue({ ...baseWallet, balance: 35.50 })
    prismaMock.wallet.findUnique.mockResolvedValue({ ...baseWallet, balance: 35.50 })
    prismaMock.walletTransaction.create.mockResolvedValue({})
    const { status, data } = await callWallet('POST', { body: { userId: 'u1', amount: 10, type: 'CREDIT' } })
    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.balance).toBe(35.50)
  })

  it('manager can debit a wallet', async () => {
    mockGetSessionUser.mockResolvedValue(MANAGER)
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', householdId: 'hh1' })
    prismaMock.wallet.upsert.mockResolvedValue({ ...baseWallet, balance: 15.50 })
    prismaMock.wallet.findUnique.mockResolvedValue({ ...baseWallet, balance: 15.50 })
    prismaMock.walletTransaction.create.mockResolvedValue({})
    const { status, data } = await callWallet('POST', { body: { userId: 'u1', amount: 10, type: 'DEBIT' } })
    expect(status).toBe(200)
    expect(data.success).toBe(true)
  })
})

// ── POST /api/wallet/convert ──────────────────────────────────────────────────

describe('POST /api/wallet/convert', () => {
  it('returns 401 when not logged in', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const { status } = await callConvert({ points: 10 })
    expect(status).toBe(401)
  })

  it('returns 400 when user has no household', async () => {
    mockGetSessionUser.mockResolvedValue({ ...MEMBER, householdId: null })
    const { status } = await callConvert({ points: 10 })
    expect(status).toBe(400)
  })

  it('returns 400 when points is not provided', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    const { status } = await callConvert({})
    expect(status).toBe(400)
  })

  it('returns 400 when rate is not set', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    prismaMock.household.findUnique.mockResolvedValue({ pointToNisRate: 0 })
    const { status } = await callConvert({ points: 10 })
    expect(status).toBe(400)
  })

  it('returns 400 when user has insufficient points', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    prismaMock.household.findUnique.mockResolvedValue({ pointToNisRate: 0.1 })
    prismaMock.event.aggregate.mockResolvedValue({ _sum: { points: 50 } })
    prismaMock.walletTransaction.aggregate.mockResolvedValue({ _sum: { pointsUsed: 40 } })
    const { status, data } = await callConvert({ points: 20 })
    expect(status).toBe(400)
    expect(data.availablePoints).toBe(10)
  })

  it('converts points to NIS and credits wallet', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    prismaMock.household.findUnique.mockResolvedValue({ pointToNisRate: 0.1 })
    prismaMock.event.aggregate.mockResolvedValue({ _sum: { points: 200 } })
    prismaMock.walletTransaction.aggregate.mockResolvedValue({ _sum: { pointsUsed: 0 } })
    prismaMock.wallet.upsert.mockResolvedValue({ ...baseWallet, balance: 10 })
    prismaMock.walletTransaction.create.mockResolvedValue({})
    prismaMock.wallet.findUnique.mockResolvedValue({ ...baseWallet, balance: 10 })
    const { status, data } = await callConvert({ points: 100 })
    expect(status).toBe(200)
    expect(data.pointsUsed).toBe(100)
    expect(data.nisAdded).toBe(10)
    expect(data.balance).toBe(10)
  })
})

// ── GET + PUT /api/household/wallet-rate ─────────────────────────────────────

describe('GET /api/household/wallet-rate', () => {
  it('returns current rate', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    prismaMock.household.findUnique.mockResolvedValue({ pointToNisRate: 0.25 })
    const { status, data } = await callWalletRate('GET')
    expect(status).toBe(200)
    expect(data.pointToNisRate).toBe(0.25)
  })

  it('returns 400 when user has no household', async () => {
    mockGetSessionUser.mockResolvedValue({ ...MEMBER, householdId: null })
    const { status } = await callWalletRate('GET')
    expect(status).toBe(400)
  })
})

describe('PUT /api/household/wallet-rate', () => {
  it('returns 403 when member tries to set rate', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    const { status } = await callWalletRate('PUT', { pointToNisRate: 0.1 })
    expect(status).toBe(403)
  })

  it('returns 400 for negative rate', async () => {
    mockGetSessionUser.mockResolvedValue(MANAGER)
    const { status } = await callWalletRate('PUT', { pointToNisRate: -1 })
    expect(status).toBe(400)
  })

  it('manager can set rate', async () => {
    mockGetSessionUser.mockResolvedValue(MANAGER)
    prismaMock.household.update.mockResolvedValue({ pointToNisRate: 0.5 })
    const { status, data } = await callWalletRate('PUT', { pointToNisRate: 0.5 })
    expect(status).toBe(200)
    expect(data.pointToNisRate).toBe(0.5)
  })
})
