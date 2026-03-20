import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPrismaMock } from '../helpers/prisma-mock'

let prismaMock: ReturnType<typeof createPrismaMock>

vi.mock('@/lib/prisma', () => ({ default: {} }))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

const mockSession = { user: { email: 'a@b.com' } }
const mockUser = { id: 'u1', email: 'a@b.com', name: 'Alice' }

beforeEach(async () => {
  prismaMock = createPrismaMock()
  const prismaModule = await import('@/lib/prisma')
  Object.assign(prismaModule.default, prismaMock)
  vi.clearAllMocks()
})

describe('GET /api/finance/goals', () => {
  it('returns 401 when unauthenticated', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/finance/goals/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns user goals', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any)
    prismaMock.financialGoal.findMany.mockResolvedValue([
      { id: 'g1', name: 'פנסיה', targetAmount: 2000000, currentAmount: 500000, isActive: true }
    ])

    const { GET } = await import('@/app/api/finance/goals/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data[0].name).toBe('פנסיה')
  })
})

describe('POST /api/finance/goals', () => {
  it('creates a goal', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any)
    prismaMock.financialGoal.create.mockResolvedValue({
      id: 'g2', name: 'דירה', targetAmount: 500000, currentAmount: 100000, isActive: true
    })

    const { POST } = await import('@/app/api/finance/goals/route')
    const req = new Request('http://localhost/api/finance/goals', {
      method: 'POST',
      body: JSON.stringify({ name: 'דירה', targetAmount: 500000, currentAmount: 100000, category: 'PROPERTY' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe('דירה')
    expect(prismaMock.financialGoal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'u1' }) })
    )
  })
})
