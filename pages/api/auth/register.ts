import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { rateLimit } from '../../../lib/rateLimit'
import { seedHouseholdDefaults } from '../../../lib/defaultActivities'
import { sendApprovalRequestEmail } from '../../../lib/email'
import { PRODUCT_ADMIN_EMAIL } from '../../../lib/productAdmin'
import { withLogging } from '../../../lib/withLogging'

async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method !== 'POST') return res.status(405).end()
    if (rateLimit(req, res, { max: 5, windowMs: 60_000, keyPrefix: 'register' })) return

    const { email, password, name, inviteCode, familyName, lang } = req.body
    const resolvedLang: string = (lang === 'en' || lang === 'he') ? lang : (req.cookies?.lang ?? 'he')
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Please provide your name (at least 2 characters)' })

    const hash = await bcrypt.hash(password, 10)

    // Check if email already exists
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      // Allow re-applying if the user deleted their household and wants to create a new one
      if (!exists.householdId && exists.approvalStatus !== 'PENDING') {
        const approvalToken = uuidv4()
        const resolvedFamilyName = (familyName && familyName.trim()) ? familyName.trim() : `${(exists.name || name).trim()}'s Family`
        await prisma.user.update({
          where: { id: exists.id },
          data: {
            passwordHash: hash,
            role: 'ADMIN',
            approvalStatus: 'PENDING',
            approvalToken,
            language: resolvedLang,
          },
        })
        const proto = (req.headers['x-forwarded-proto'] as string) || 'http'
        const host = req.headers.host || 'localhost:3000'
        const approveUrl = `${proto}://${host}/api/admin/approve?token=${approvalToken}&family=${encodeURIComponent(resolvedFamilyName)}&lang=${resolvedLang}`
        try {
          await sendApprovalRequestEmail(PRODUCT_ADMIN_EMAIL, (exists.name || name).trim(), email, resolvedFamilyName, approveUrl)
        } catch (emailErr) {
          console.error('Failed to send re-approval email (non-fatal):', emailErr)
        }
        return res.json({ pending: true })
      }
      if (!exists.householdId && exists.approvalStatus === 'PENDING') {
        return res.status(400).json({ error: 'Your request is already pending approval. Please wait for confirmation.' })
      }
      return res.status(400).json({ error: 'An account with this email already exists' })
    }

    // --- Path A: Join existing family with invite code ---
    if (inviteCode && inviteCode.trim()) {
      const code = inviteCode.trim().toUpperCase()
      const invite = await prisma.invite.findUnique({ where: { code } })

      if (!invite) return res.status(400).json({ error: 'Invalid invite code. Please check and try again.' })
      if (invite.usedById) return res.status(400).json({ error: 'This invite code has already been used.' })
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return res.status(400).json({ error: 'This invite code has expired. Ask your family manager for a new one.' })
      }

      const user = await prisma.user.create({
        data: {
          email,
          name: name.trim(),
          passwordHash: hash,
          householdId: invite.householdId,
          role: 'MEMBER'
        }
      })

      // Mark invite as used
      await prisma.invite.update({ where: { id: invite.id }, data: { usedById: user.id } })

      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        householdId: user.householdId,
        role: user.role
      })
    }

    // --- Path B: Create a new family — requires product-admin approval ---
    const approvalToken = uuidv4()
    const resolvedFamilyName = (familyName && familyName.trim()) ? familyName.trim() : `${name.trim()}'s Family`

    const user = await prisma.user.create({
      data: {
        email,
        name: name.trim(),
        passwordHash: hash,
        role: 'ADMIN',
        approvalStatus: 'PENDING',
        approvalToken,
        // Store desired family name temporarily in a metadata field via language
        language: resolvedLang,
      }
    })

    // Build the approval URL for the product admin
    const proto = (req.headers['x-forwarded-proto'] as string) || 'http'
    const host = req.headers.host || 'localhost:3000'
    const approveUrl = `${proto}://${host}/api/admin/approve?token=${approvalToken}&family=${encodeURIComponent(resolvedFamilyName)}&lang=${resolvedLang}`

    try {
      await sendApprovalRequestEmail(
        PRODUCT_ADMIN_EMAIL,
        name.trim(),
        email,
        resolvedFamilyName,
        approveUrl,
      )
    } catch (emailErr) {
      console.error('Failed to send approval email (non-fatal):', emailErr)
    }

    return res.json({ pending: true })

  }catch(e: any){
    console.error('[auth/register] error:', e?.stack || e)
    res.status(500).json({ error: 'Server error. Please try again.' })
  }
}

export default withLogging(handler)
