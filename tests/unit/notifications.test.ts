import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { createPrismaMock } from '../helpers/prisma-mock'

let prismaMock: ReturnType<typeof createPrismaMock>

vi.mock('@/lib/prisma', () => ({ default: {} }))
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}))
vi.mock('@/pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

beforeEach(async () => {
  prismaMock = createPrismaMock()
  const prismaModule = await import('@/lib/prisma')
  Object.assign(prismaModule.default, prismaMock)
  vi.clearAllMocks()
})

async function callNotificationsHandler(method: string, sessionOverride?: any) {
  const { getServerSession } = await import('next-auth')
  vi.mocked(getServerSession).mockResolvedValue(
    sessionOverride !== undefined ? sessionOverride : { user: { id: 'u1', email: 'a@b.com' } }
  )
  const { req, res } = createMocks({ method: method as any })
  const { default: handler } = await import('@/pages/api/notifications')
  await handler(req as any, res as any)
  return { status: res._getStatusCode(), data: res._getJSONData() }
}

describe('GET /api/notifications (household)', () => {
  it('returns 401 when unauthenticated', async () => {
    const { status } = await callNotificationsHandler('GET', null)
    expect(status).toBe(401)
  })

  it('returns 405 for non-GET methods', async () => {
    const { status } = await callNotificationsHandler('POST')
    expect(status).toBe(405)
  })

  it('returns empty notifications when user has no household', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ householdId: null })
    const { status, data } = await callNotificationsHandler('GET')
    expect(status).toBe(200)
    expect(data.notifications).toEqual([])
  })

  it('returns 200 querying activities (fixed: was querying non-existent task fields)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ householdId: 'hh1' })
    // After fix: uses activity.findMany with valid schema fields
    prismaMock.activity.findMany.mockResolvedValue([])
    const { status } = await callNotificationsHandler('GET')
    expect(status).toBe(200)
  })
})

describe('Finance notifications GET /api/finance/notifications', () => {
  it('returns 401 when unauthenticated', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/finance/notifications/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns notifications list', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'a@b.com' } } as any)
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any)
    prismaMock.notification.findMany.mockResolvedValue([
      { id: 'n1', type: 'VALUE_CHANGE', title: 'שינוי', message: 'עלה', isRead: false, createdAt: new Date() }
    ])

    const { GET } = await import('@/app/api/finance/notifications/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data[0].type).toBe('VALUE_CHANGE')
  })
})
