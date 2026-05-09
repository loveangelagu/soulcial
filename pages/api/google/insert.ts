import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Bulk-insert events into a user's primary Google Calendar.
 *
 * Body: { accessToken: string, events: Array<{...}> }
 * Each event needs: summary, start (ISO), end (ISO), description, location.
 */
type InsertEvent = {
  summary: string
  description?: string
  location?: string
  start: string
  end: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { accessToken, events } = req.body as {
    accessToken: string
    events: InsertEvent[]
  }
  if (!accessToken || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'Missing accessToken or events' })
  }

  const results: { ok: boolean; error?: string; htmlLink?: string }[] = []
  for (const e of events) {
    const r = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: e.summary,
          description: e.description,
          location: e.location,
          start: { dateTime: e.start, timeZone: 'Asia/Makassar' },
          end:   { dateTime: e.end,   timeZone: 'Asia/Makassar' },
        }),
      },
    )
    if (!r.ok) {
      const txt = await r.text()
      results.push({ ok: false, error: `${r.status}: ${txt.slice(0, 200)}` })
    } else {
      const data = await r.json()
      results.push({ ok: true, htmlLink: data.htmlLink })
    }
  }

  res.status(200).json({
    inserted: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  })
}
