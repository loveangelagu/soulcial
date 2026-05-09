import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'

/**
 * OAuth redirect target. Exchanges the code for an access token, then redirects
 * the user back to / with the token in a temporary URL fragment.
 *
 * Storing tokens in the URL fragment (#access_token=...) means the server never
 * sees it — quick + good enough for a hackathon. For production, store
 * server-side and issue a session cookie.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = process.env.GOOGLE_CLIENT_ID
  const secret = process.env.GOOGLE_CLIENT_SECRET
  const redirect = process.env.GOOGLE_REDIRECT_URI

  if (!id || !secret || !redirect) {
    return res.status(503).send('Google OAuth not configured')
  }

  const code = typeof req.query.code === 'string' ? req.query.code : null
  if (!code) return res.status(400).send('Missing code')

  try {
    const oauth2 = new google.auth.OAuth2(id, secret, redirect)
    const { tokens } = await oauth2.getToken(code)
    const access = tokens.access_token
    if (!access) return res.status(500).send('No access token returned')
    // bounce back to / with token in fragment so client can read it
    res.redirect(`/#gcal_token=${encodeURIComponent(access)}`)
  } catch (e: any) {
    console.error('callback error:', e?.message)
    res.status(500).send(`OAuth callback failed: ${e?.message ?? 'unknown'}`)
  }
}
