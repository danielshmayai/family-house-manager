import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { createPrismaMock } from '../helpers/prisma-mock'

let prismaMock: ReturnType<typeof createPrismaMock>

vi.mock('@/lib/prisma', () => ({ default: {} }))
vi.mock('@/lib/apiAuth', () => ({
  getSessionUser: vi.fn(),
  isManager: (role: string) => role === 'ADMIN' || role === 'MANAGER',
}))

import { getSessionUser } from '@/lib/apiAuth'
const mockGetSessionUser = getSessionUser as ReturnType<typeof vi.fn>

const MEMBER  = { id: 'u1', email: 'alice@x.com', name: 'Alice', householdId: 'hh1', role: 'MEMBER' }
const MANAGER = { id: 'u2', email: 'bob@x.com',   name: 'Bob',   householdId: 'hh1', role: 'ADMIN'  }

const baseTask = {
  id: 't1',
  title: 'Clean room',
  description: null,
  assignedById: 'u2',
  assignedToId: 'u1',
  householdId: 'hh1',
  isCompleted: false,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  assignedBy: { id: 'u2', name: 'Bob', role: 'ADMIN' },
  assignedTo: { id: 'u1', name: 'Alice' },
}

beforeEach(async () => {
  prismaMock = createPrismaMock()
  const prismaModule = await import('@/lib/prisma')
  Object.assign(prismaModule.default, prismaMock)
  vi.clearAllMocks()
})

async function callHandler(method: string, opts: { query?: any; body?: any } = {}) {
  const { req, res } = createMocks({ method: method as any, query: opts.query ?? {}, body: opts.body ?? {} })
  const { default: handler } = await import('@/pages/api/my-tasks')
  await handler(req as any, res as any)
  return { status: res._getStatusCode(), data: res._getJSONData() }
}

// ── Auth guards ───────────────────────────────────────────────────────────────

describe('Auth', () => {
  it('returns 401 when not logged in', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const { status } = await callHandler('GET')
    expect(status).toBe(401)
  })

  it('returns 400 when user has no household', async () => {
    mockGetSessionUser.mockResolvedValue({ ...MEMBER, householdId: null })
    const { status } = await callHandler('GET')
    expect(status).toBe(400)
  })
})

// ── GET ───────────────────────────────────────────────────────────────────────

describe('GET /api/my-tasks', () => {
  beforeEach(() => mockGetSessionUser.mockResolvedValue(MEMBER))

  it('returns tasks for the current user by default', async () => {
    prismaMock.userTask.findMany.mockResolvedValue([baseTask])
    const { status, data } = await callHandler('GET')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(prismaMock.userTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { assignedToId: 'u1', householdId: 'hh1' } })
    )
  })

  it('forbids members from viewing another user\'s tasks', async () => {
    const { status } = await callHandler('GET', { query: { userId: 'u99' } })
    expect(status).toBe(403)
  })

  it('allows managers to view another user\'s tasks', async () => {
    mockGetSessionUser.mockResolvedValue(MANAGER)
    prismaMock.userTask.findMany.mockResolvedValue([])
    const { status } = await callHandler('GET', { query: { userId: 'u1' } })
    expect(status).toBe(200)
    expect(prismaMock.userTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { assignedToId: 'u1', householdId: 'hh1' } })
    )
  })
})

// ── POST ──────────────────────────────────────────────────────────────────────

describe('POST /api/my-tasks', () => {
  beforeEach(() => mockGetSessionUser.mockResolvedValue(MANAGER))

  it('requires a title', async () => {
    const { status, data } = await callHandler('POST', { body: {} })
    expect(status).toBe(400)
    expect(data.error).toMatch(/title/i)
  })

  it('rejects blank title', async () => {
    const { status, data } = await callHandler('POST', { body: { title: '   ' } })
    expect(status).toBe(400)
    expect(data.error).toMatch(/title/i)
  })

  it('forbids member from assigning tasks to others', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    const { status, data } = await callHandler('POST', { body: { title: 'Do dishes', assignedToId: 'u2' } })
    expect(status).toBe(403)
    expect(data.error).toMatch(/members/i)
  })

  it('returns 400 if target user is not in household', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null)
    const { status, data } = await callHandler('POST', { body: { title: 'Vacuum', assignedToId: 'u-other' } })
    expect(status).toBe(400)
    expect(data.error).toMatch(/not found in household/i)
  })

  it('creates a task assigned to another user (manager path)', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'u1' })
    prismaMock.userTask.create.mockResolvedValue({ ...baseTask, title: 'Vacuum' })
    const { status, data } = await callHandler('POST', { body: { title: 'Vacuum', assignedToId: 'u1' } })
    expect(status).toBe(201)
    expect(data.title).toBe('Vacuum')
  })

  it('allows a member to create a self-assigned task', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    prismaMock.user.findFirst.mockResolvedValue({ id: 'u1' })
    prismaMock.userTask.create.mockResolvedValue({ ...baseTask, assignedById: 'u1', assignedToId: 'u1', title: 'Study' })
    const { status, data } = await callHandler('POST', { body: { title: 'Study' } })
    expect(status).toBe(201)
    expect(data.title).toBe('Study')
  })
})

// ── PUT (toggle completion) ───────────────────────────────────────────────────

describe('PUT /api/my-tasks', () => {
  beforeEach(() => mockGetSessionUser.mockResolvedValue(MEMBER))

  it('requires task id', async () => {
    const { status, data } = await callHandler('PUT', { body: { isCompleted: true } })
    expect(status).toBe(400)
    expect(data.error).toMatch(/id/i)
  })

  it('returns 404 for unknown task', async () => {
    prismaMock.userTask.findUnique.mockResolvedValue(null)
    const { status } = await callHandler('PUT', { body: { id: 'bad', isCompleted: true } })
    expect(status).toBe(404)
  })

  it('forbids cross-household access', async () => {
    prismaMock.userTask.findUnique.mockResolvedValue({ ...baseTask, householdId: 'hh-other' })
    const { status } = await callHandler('PUT', { body: { id: 't1', isCompleted: true } })
    expect(status).toBe(403)
  })

  it('forbids a member from toggling a task not assigned to them', async () => {
    prismaMock.userTask.findUnique.mockResolvedValue({ ...baseTask, assignedToId: 'u99', assignedBy: { role: 'ADMIN' } })
    const { status } = await callHandler('PUT', { body: { id: 't1', isCompleted: true } })
    expect(status).toBe(403)
  })

  it('marks task complete and checks bonus (no prior bonus, not all complete)', async () => {
    prismaMock.userTask.findUnique.mockResolvedValue({ ...baseTask, assignedBy: { role: 'ADMIN' } })
    prismaMock.userTask.update.mockResolvedValue({ ...baseTask, isCompleted: true })
    prismaMock.userTask.findMany.mockResolvedValue([{ ...baseTask, isCompleted: false }]) // still one incomplete
    const { status, data } = await callHandler('PUT', { body: { id: 't1', isCompleted: true } })
    expect(status).toBe(200)
    expect(data.bonusGranted).toBe(false)
  })

  it('awards bonus when all manager tasks are complete and no prior bonus', async () => {
    prismaMock.userTask.findUnique.mockResolvedValue({ ...baseTask, assignedBy: { role: 'ADMIN' } })
    prismaMock.userTask.update.mockResolvedValue({ ...baseTask, isCompleted: true })
    prismaMock.userTask.findMany.mockResolvedValue([{ ...baseTask, isCompleted: true }])
    prismaMock.event.findFirst.mockResolvedValue(null) // no existing bonus
    prismaMock.event.create.mockResolvedValue({ id: 'ev-bonus' })
    const { status, data } = await callHandler('PUT', { body: { id: 't1', isCompleted: true } })
    expect(status).toBe(200)
    expect(data.bonusGranted).toBe(true)
    expect(prismaMock.event.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'BONUS_TASKS_COMPLETED', points: 20 }) })
    )
  })

  it('does not award duplicate bonus if one already exists', async () => {
    prismaMock.userTask.findUnique.mockResolvedValue({ ...baseTask, assignedBy: { role: 'ADMIN' } })
    prismaMock.userTask.update.mockResolvedValue({ ...baseTask, isCompleted: true })
    prismaMock.userTask.findMany.mockResolvedValue([{ ...baseTask, isCompleted: true }])
    prismaMock.event.findFirst.mockResolvedValue({ id: 'ev-existing-bonus' })
    const { status, data } = await callHandler('PUT', { body: { id: 't1', isCompleted: true } })
    expect(status).toBe(200)
    expect(data.bonusGranted).toBe(false)
    expect(prismaMock.event.create).not.toHaveBeenCalled()
  })

  it('revokes bonus event when uncompleting a manager-assigned task', async () => {
    prismaMock.userTask.findUnique.mockResolvedValue({
      ...baseTask,
      assignedById: 'u2', assignedToId: 'u1',
      assignedBy: { role: 'ADMIN' }
    })
    prismaMock.userTask.update.mockResolvedValue({ ...baseTask, isCompleted: false })
    prismaMock.event.deleteMany.mockResolvedValue({ count: 1 })
    const { status } = await callHandler('PUT', { body: { id: 't1', isCompleted: false } })
    expect(status).toBe(200)
    expect(prismaMock.event.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ eventType: 'BONUS_TASKS_COMPLETED' }) })
    )
  })
})

// ── DELETE ────────────────────────────────────────────────────────────────────

describe('DELETE /api/my-tasks', () => {
  beforeEach(() => mockGetSessionUser.mockResolvedValue(MANAGER))

  it('requires task id', async () => {
    const { status, data } = await callHandler('DELETE', { query: {} })
    expect(status).toBe(400)
    expect(data.error).toMatch(/id/i)
  })

  it('returns 404 for unknown task', async () => {
    prismaMock.userTask.findUnique.mockResolvedValue(null)
    const { status } = await callHandler('DELETE', { query: { id: 'bad' } })
    expect(status).toBe(404)
  })

  it('forbids deleting a task from another household', async () => {
    prismaMock.userTask.findUnique.mockResolvedValue({ ...baseTask, householdId: 'hh-other' })
    const { status } = await callHandler('DELETE', { query: { id: 't1' } })
    expect(status).toBe(403)
  })

  it('allows member to cancel a manager-assigned task assigned to them', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    prismaMock.userTask.findUnique.mockResolvedValue({ ...baseTask, assignedById: 'u2', assignedToId: 'u1' })
    prismaMock.userTask.delete.mockResolvedValue({})
    const { status, data } = await callHandler('DELETE', { query: { id: 't1' } })
    expect(status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('forbids member from deleting a task assigned to someone else', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    prismaMock.userTask.findUnique.mockResolvedValue({ ...baseTask, assignedById: 'u2', assignedToId: 'u3' })
    const { status } = await callHandler('DELETE', { query: { id: 't1' } })
    expect(status).toBe(403)
  })

  it('allows member to delete their own self-assigned task', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    prismaMock.userTask.findUnique.mockResolvedValue({ ...baseTask, assignedById: 'u1', assignedToId: 'u1' })
    prismaMock.userTask.delete.mockResolvedValue({})
    const { status, data } = await callHandler('DELETE', { query: { id: 't1' } })
    expect(status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('allows manager to delete any task', async () => {
    prismaMock.userTask.findUnique.mockResolvedValue(baseTask)
    prismaMock.userTask.delete.mockResolvedValue({})
    const { status, data } = await callHandler('DELETE', { query: { id: 't1' } })
    expect(status).toBe(200)
    expect(data.success).toBe(true)
  })
})

// ── Method guard ──────────────────────────────────────────────────────────────

describe('Method handling', () => {
  it('returns 405 for unsupported method', async () => {
    mockGetSessionUser.mockResolvedValue(MEMBER)
    const { status } = await callHandler('PATCH')
    expect(status).toBe(405)
  })
})
