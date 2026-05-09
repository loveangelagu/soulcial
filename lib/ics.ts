/**
 * Build an .ics calendar file from a list of events.
 * Importable into Google Calendar, Apple Calendar, Outlook, etc.
 * No OAuth, no API keys, works offline. Fallback when Google OAuth is flaky.
 */

import type { RankedEvent } from '@/lib/ranking'

const CRLF = '\r\n'

function pad(n: number) { return n < 10 ? `0${n}` : `${n}` }

/** Convert a JS Date to an iCal UTC timestamp like 20260508T043000Z */
function icsTimestamp(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

/** RFC-5545: escape commas, semicolons, backslashes, newlines. */
function icsEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

export function buildIcs(events: RankedEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//vibecheck-bali//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  const stamp = icsTimestamp(new Date())
  for (const e of events) {
    const start = new Date(e.starts_at)
    const end = e.ends_at
      ? new Date(e.ends_at)
      : new Date(start.getTime() + 60 * 60 * 1000) // default 1h
    const summary = icsEscape(e.name)
    const location = icsEscape([e.venue_name, e.city].filter(Boolean).join(', '))
    const descParts = [
      e.actual_vibe ? `Actually: ${e.actual_vibe}` : null,
      e.best_for ? `Best for: ${e.best_for}` : null,
      `Vibe match: ${Math.round(e.score * 100)}%`,
      `Source: https://nomeo.io/m/${e.uid}`,
    ].filter(Boolean)
    const description = icsEscape(descParts.join('\n'))

    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@vibecheck-bali`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsTimestamp(start)}`,
      `DTEND:${icsTimestamp(end)}`,
      `SUMMARY:${summary}`,
      location ? `LOCATION:${location}` : '',
      description ? `DESCRIPTION:${description}` : '',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.filter(Boolean).join(CRLF) + CRLF
}

export function downloadIcs(filename: string, events: RankedEvent[]) {
  const ics = buildIcs(events)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
