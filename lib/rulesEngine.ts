import prisma from './prisma'
import { Event as EventModel } from '@prisma/client'
import { startOfDay, subDays, isSameDay } from 'date-fns'

export type PointsResult = {
  userId: string
  points: number
  activitiesCount: number
  breakdown: Array<{ reason: string; points: number }>
}

export async function computePointsForUser(userId: string, householdId: string, since?: Date): Promise<PointsResult> {
  const where: any = { recordedById: userId, householdId }
  if (since) where.occurredAt = { gte: since }

  const events = await prisma.event.findMany({ where })
  return computePointsFromEvents(userId, events)
}

/** Compute points from a pre-fetched array of events (avoids N+1 queries) */
export function computePointsFromEvents(userId: string, events: EventModel[]): PointsResult {
  let total = 0
  let activitiesCount = 0
  const breakdown: PointsResult['breakdown'] = []

  for (const e of events) {
    const pts = pointsForEvent(e)
    if (pts === 0) continue
    total += pts
    if (e.activityId) activitiesCount++
    breakdown.push({ reason: e.eventType, points: pts })
  }

  return { userId, points: total, activitiesCount, breakdown }
}

export function pointsForEvent(e: EventModel): number {
  // If points are stored on the event (activity completions), use those directly
  if (e.points > 0) return e.points

  // Fallback rules for special event types without stored points
  switch(e.eventType){
    case 'LATE': return -5
    case 'ABSENT': return -10
    case 'BONUS_KINDNESS': return 8
    default: return 0
  }
}

/** Compute consecutive-day streak for a user by looking at event history */
export async function computeStreakForUser(userId: string, householdId: string): Promise<number> {
  // Fetch last 90 days of events to compute streak
  const since = subDays(new Date(), 90)
  const events = await prisma.event.findMany({
    where: {
      recordedById: userId,
      householdId,
      occurredAt: { gte: since },
      activityId: { not: null }
    },
    orderBy: { occurredAt: 'desc' },
    select: { occurredAt: true }
  })

  if (events.length === 0) return 0

  // Get unique days (normalized to start of day)
  const uniqueDays = new Set<string>()
  for (const e of events) {
    uniqueDays.add(startOfDay(new Date(e.occurredAt)).toISOString())
  }

  const sortedDays = Array.from(uniqueDays)
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())

  // Check if today or yesterday has activity (streak must be current)
  const today = startOfDay(new Date())
  const yesterday = startOfDay(subDays(new Date(), 1))
  if (!isSameDay(sortedDays[0], today) && !isSameDay(sortedDays[0], yesterday)) {
    return 0
  }

  // Count consecutive days
  let streak = 1
  for (let i = 1; i < sortedDays.length; i++) {
    const expected = startOfDay(subDays(sortedDays[0], i))
    if (isSameDay(sortedDays[i], expected)) {
      streak++
    } else {
      break
    }
  }

  return streak
}
