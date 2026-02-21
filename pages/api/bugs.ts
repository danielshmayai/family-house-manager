import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method === 'GET'){
      const bugs = await prisma.bugReport.findMany({ orderBy: { createdAt: 'desc' } })
      return res.json(bugs)
    }

    if (req.method === 'POST'){
      const payload = req.body
      if (!payload || !payload.title || !payload.description) return res.status(400).json({ error: 'missing fields' })
      const b = await prisma.bugReport.create({ data: { title: payload.title, description: payload.description, reportedBy: payload.reportedBy } })

      // If GitHub integration is configured, create an issue
      const repo = process.env.GITHUB_REPO // expect 'owner/repo'
      const token = process.env.GITHUB_TOKEN
      if (repo && token){
        try{
          const issueBody = `Reported by: ${payload.reportedBy || 'unknown'}\n\n${payload.description}`
          const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
            method: 'POST',
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github+json'
            },
            body: JSON.stringify({ title: `[Bug] ${payload.title}`, body: issueBody, labels: ['bug','reported-via-app'] })
          })
          if (response.ok){
            const issueData = await response.json()
            // attach issue url to response for convenience
            return res.json({ ...b, githubIssue: { url: issueData.html_url, number: issueData.number } })
          } else {
            const errTxt = await response.text().catch(()=>null)
            console.warn('GitHub issue creation failed', response.status, errTxt)
            return res.json(b)
          }
        }catch(e){
          console.error('GitHub integration error', e)
          return res.json(b)
        }
      }
      return res.json(b)
    }

    if (req.method === 'PUT' || req.method === 'PATCH'){
      const payload = req.body || {}
      const id = payload.id || req.query.id
      if (!id) return res.status(400).json({ error: 'missing id' })
      const data: any = { ...payload }
      delete data.id
      if (typeof data.resolved !== 'undefined' && data.resolved) data.resolvedAt = new Date()
      const updated = await prisma.bugReport.update({ where: { id: String(id) }, data })
      return res.json(updated)
    }

    if (req.method === 'DELETE'){
      const id = req.query.id
      if (!id) return res.status(400).json({ error: 'missing id' })
      await prisma.bugReport.delete({ where: { id: String(id) } })
      return res.json({ ok: true })
    }

    res.status(405).end()
  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'server error' })
  }
}
