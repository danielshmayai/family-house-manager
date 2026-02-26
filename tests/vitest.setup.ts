import { vi } from 'vitest'

// Mock next-auth globally so App Router handlers can be tested without a real session
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}))

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}))
