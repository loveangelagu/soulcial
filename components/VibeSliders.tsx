/**
 * Public types + defaults for the "Tune your week" surface.
 *
 * The visible UI now lives in `VibeTuner.tsx`; this file is the stable
 * type/default contract used by `pages/index.tsx`, `lib/ranking.ts`, and the
 * localStorage migrator. Re-exports `VibeTuner` as `VibeSlidersUI` so any
 * older callers keep working without touching their imports.
 */

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'
// 0 = Sunday, 6 = Saturday — matches Date.getDay()
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type EnergyFloor = 'any' | 'medium+' | 'high'
export type GroupSize = 'any' | 'solo-ok' | 'small' | 'crowd'

export type VibeSliders = {
  tempo: number
  social: number
  stretch: number
  // Stored as sorted arrays (not Sets) so they JSON-serialize cleanly into
  // localStorage. Treated as sets at the call site.
  timeOfDay: TimeOfDay[]
  daysAvailable: DayOfWeek[]
  energyFloor: EnergyFloor
  groupSize: GroupSize
}

export const ALL_TIMES_OF_DAY: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night']
export const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6]

export const DEFAULT_SLIDERS: VibeSliders = {
  tempo: 0.5,
  social: 0.5,
  stretch: 0.5,
  timeOfDay: [...ALL_TIMES_OF_DAY],
  daysAvailable: [...ALL_DAYS],
  energyFloor: 'any',
  groupSize: 'any',
}

/**
 * Fill in any missing fields on a partial `VibeSliders` (e.g. one rehydrated
 * from an older localStorage shape). Always returns a complete object.
 */
export function migrateSliders(raw: unknown): VibeSliders {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<VibeSliders>
  return {
    tempo: typeof r.tempo === 'number' ? r.tempo : DEFAULT_SLIDERS.tempo,
    social: typeof r.social === 'number' ? r.social : DEFAULT_SLIDERS.social,
    stretch: typeof r.stretch === 'number' ? r.stretch : DEFAULT_SLIDERS.stretch,
    timeOfDay: Array.isArray(r.timeOfDay) && r.timeOfDay.length > 0
      ? (r.timeOfDay.filter((t) => ALL_TIMES_OF_DAY.includes(t as TimeOfDay)) as TimeOfDay[])
      : [...ALL_TIMES_OF_DAY],
    daysAvailable: Array.isArray(r.daysAvailable) && r.daysAvailable.length > 0
      ? (r.daysAvailable.filter((d): d is DayOfWeek =>
          typeof d === 'number' && d >= 0 && d <= 6) as DayOfWeek[])
      : [...ALL_DAYS],
    energyFloor: r.energyFloor === 'medium+' || r.energyFloor === 'high'
      ? r.energyFloor
      : 'any',
    groupSize: r.groupSize === 'solo-ok' || r.groupSize === 'small' || r.groupSize === 'crowd'
      ? r.groupSize
      : 'any',
  }
}

// Re-export the new tuner under the old name so older imports keep working.
export { VibeTuner as VibeSlidersUI } from './VibeTuner'
