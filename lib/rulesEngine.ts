import prisma from './prisma'
import { Event as EventModel } from '@prisma/client'

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

  let total = 0
  let activitiesCount = 0
  const breakdown: PointsResult['breakdown'] = []

  for(const e of events){
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
