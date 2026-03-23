import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { withLogging } from '../../../lib/withLogging'

async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method === 'GET'){
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { householdId, recordedById } = req.query

      const where: any = {
        occurredAt: { gte: today, lt: tomorrow }
      }
      if (householdId) where.householdId = String(householdId)
      if (recordedById) where.recordedById = String(recordedById)

      const events = await prisma.event.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        include: {
          activity: { select: { id: true, name: true, icon: true, defaultPoints: true } },
          recordedBy: { select: { id: true, name: true, email: true } }
        }
      })

      const eventsWithName = events.map((e: any) => ({
        ...e,
        recordedByName: e.recordedBy?.name || e.recordedBy?.email
      }))

      return res.json(eventsWithName)
    }

    res.status(405).end()
  }catch(e: any){
    console.error('[events/today] error:', e?.stack || e)
    res.status(500).json({ error: 'server error' })
  }
}

export default withLogging(handler)
