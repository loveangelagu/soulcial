/**
 * Minimal types for the one knob the user controls: Pace.
 *
 * Pace decides how many events appear per day in the plan:
 *   slow  → 1 event/day
 *   mixed → 2 events/day
 *   busy  → 3 events/day
 */

export type Pace = 'slow' | 'mixed' | 'busy'

export const PACE_VALUES: Pace[] = ['slow', 'mixed', 'busy']

export const DEFAULT_PACE: Pace = 'mixed'

export function paceToEventsPerDay(pace: Pace): number {
  switch (pace) {
    case 'slow':  return 1
    case 'mixed': return 2
    case 'busy':  return 3
  }
}

/**
 * Tempo dim bias for the user's personality vector.
 * Sliding from slow to busy nudges the user's `tempo` dim accordingly.
 */
export function paceToTempoBias(pace: Pace): number {
  switch (pace) {
    case 'slow':  return 0.2
    case 'mixed': return 0.5
    case 'busy':  return 0.8
  }
}
