import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'

/**
 * Begin the Google OAuth dance. Returns { url } that the client redirects to.
 * If creds aren't configured, returns 503 — the UI falls back to the .ics download.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = process.env.GOOGLE_CLIENT_ID
  const secret = process.env.GOOGLE_CLIENT_SECRET
  const redirect = process.env.GOOGLE_REDIRECT_URI

  if (!id || !secret || !redirect) {
    return res.status(503).json({ error: 'Google OAuth not configured' })
  }

  const oauth2 = new google.auth.OAuth2(id, secret, redirect)
  const url = oauth2.generateAuthUrl({
    access_type: 'online',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent',
  })
  res.status(200).json({ url })
}
