import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { getSessionUser } from '../../lib/apiAuth'
import { sendApprovalRequestEmail } from '../../lib/email'
import { PRODUCT_ADMIN_EMAIL } from '../../lib/productAdmin'
import { withLogging } from '../../lib/withLogging'

async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method === 'DELETE') {
      const sessionUser = await getSessionUser(req, res)
      if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })
      if (sessionUser.role !== 'ADMIN') return res.status(403).json({ error: 'Only admin can delete the household' })
      const householdId = sessionUser.householdId
      if (!householdId) return res.status(400).json({ error: 'No household found' })

      // Delete in correct FK order
      await prisma.event.deleteMany({ where: { householdId } })
      const categories = await prisma.category.findMany({ where: { householdId }, select: { id: true } })
      const catIds = categories.map((c: { id: string }) => c.id)
      if (catIds.length > 0) {
        await prisma.activity.deleteMany({ where: { categoryId: { in: catIds } } })
      }
      await prisma.category.deleteMany({ where: { householdId } })
      await prisma.invite.deleteMany({ where: { householdId } })
      await prisma.user.updateMany({ where: { householdId }, data: { householdId: null, role: 'MEMBER', approvalStatus: 'PENDING' } })
      await prisma.household.delete({ where: { id: householdId } })

      // Give the admin a new approvalToken so they can re-request a family via the register flow
      const approvalToken = uuidv4()
      const adminUser = await prisma.user.update({
        where: { id: sessionUser.id },
        data: { approvalToken, role: 'ADMIN' },
      })

      // Notify product admin so the user can be re-approved if desired
      const proto = (req.headers['x-forwarded-proto'] as string) || 'http'
      const host = req.headers.host || 'localhost:3000'
      const defaultFamily = `${adminUser.name || adminUser.email}'s Family`
      const approveUrl = `${proto}://${host}/api/admin/approve?token=${approvalToken}&family=${encodeURIComponent(defaultFamily)}&lang=${adminUser.language}`
      try {
        await sendApprovalRequestEmail(PRODUCT_ADMIN_EMAIL, adminUser.name || adminUser.email, adminUser.email, defaultFamily, approveUrl)
      } catch (emailErr) {
        console.error('Failed to send re-approval email (non-fatal):', emailErr)
      }

      return res.json({ success: true })
    }

    if (req.method === 'POST'){
      const { name, createdById, action, householdId, email } = req.body
      
      // Generate invite code for existing household
      if (action === 'generateInvite') {
        if (!householdId) return res.status(400).json({ error: 'householdId required' })
        
        const code = uuidv4().substring(0, 8).toUpperCase()
        const invite = await prisma.invite.create({ 
          data: { 
            householdId, 
            code, 
            createdById: createdById || 'system',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          } 
        })
        return res.json({ code: invite.code, expiresAt: invite.expiresAt })
      }
      
      // Create new household
      const h = await prisma.household.create({ data: { name } })
      // create invite code
      const code = uuidv4()
      await prisma.invite.create({ data: { householdId: h.id, code, createdById } })
      return res.json({ household: h, inviteCode: code })
    }

    if (req.method === 'GET'){
      const { id } = req.query
      const h = await prisma.household.findUnique({ where: { id: String(id) }, include: { members: true } })
      return res.json(h)
    }

    res.status(405).end()
  }catch(e: any){
    console.error('[households] error:', e?.stack || e)
    res.status(500).json({ error: 'server error' })
  }
}

export default withLogging(handler)
