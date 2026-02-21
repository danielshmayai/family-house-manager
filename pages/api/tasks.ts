import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method === 'GET'){
      const tasks = await prisma.task.findMany({ include: { category: true } })
      return res.json(tasks)
    }

    if (req.method === 'POST'){
      const payload = req.body
      if (!payload || !payload.key || !payload.categoryId || !payload.name) return res.status(400).json({ error: 'missing fields' })
      const t = await prisma.task.create({ data: payload })
      return res.json(t)
    }

    if (req.method === 'PUT' || req.method === 'PATCH'){
      const payload = req.body || {}
      const id = payload.id || req.query.id
      if (!id) return res.status(400).json({ error: 'missing id' })
      const data: any = { ...payload }
      delete data.id
      const updated = await prisma.task.update({ where: { id: String(id) }, data })
      return res.json(updated)
    }

    if (req.method === 'DELETE'){
      const id = req.query.id
      if (!id) return res.status(400).json({ error: 'missing id' })
      await prisma.task.delete({ where: { id: String(id) } })
      return res.json({ ok: true })
    }

    res.status(405).end()
  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'server error' })
  }
}
