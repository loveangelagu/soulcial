import { PERSONALITY_DIMS, type PersonalityDim, type PersonalityVec } from '@/lib/personality/vector'
import type { ArchetypeId } from '@/lib/avatars'

type Line = { text: string; avatar: ArchetypeId }

/**
 * Top-2-dim pair → tagline. Keys are sorted alphabetically so we only need
 * one lookup direction. Covers the most common pairings out of C(12,2)=66.
 */
const PAIR_TAGLINES: Record<string, Line> = {
  // wellness / body
  'embodiment+stillness':        { text: "You're a quiet body. 🌿",        avatar: 'healer' },
  'embodiment+openness':         { text: "You're a curious body. 🌊",      avatar: 'wonderwoman' },
  'edge_seeking+embodiment':     { text: "You're a brave body. 🌊",        avatar: 'wonderwoman' },
  'embodiment+expression':       { text: "You're a moving artist. 💃",     avatar: 'wonderwoman' },
  'communion+embodiment':        { text: "You're a body in motion together. 🌊", avatar: 'wonderwoman' },

  // stillness / inner
  'mystic+stillness':            { text: "You're a contemplative seeker. 🌙", avatar: 'priestess' },
  'openness+stillness':          { text: "You're a curious quiet. 🧘",     avatar: 'healer' },
  'service+stillness':           { text: "You're a quiet healer. ✨",      avatar: 'healer' },
  'communion+stillness':         { text: "You're quietly together. 🕯",    avatar: 'healer' },

  // mystic / esoteric
  'embodiment+mystic':           { text: "You're an embodied seer. 🌙",    avatar: 'priestess' },
  'mystic+openness':             { text: "You're a curious mystic. 🔮",    avatar: 'visionary' },
  'communion+mystic':            { text: "You're a circle keeper. 🌀",     avatar: 'priestess' },

  // edge / adventure
  'agency+edge_seeking':         { text: "You're a wild builder. 🔥",      avatar: 'rebel' },
  'edge_seeking+openness':       { text: "You're a curious risk-taker. 🚀", avatar: 'rebel' },
  'edge_seeking+expression':     { text: "You're a wild expression. 🎨",   avatar: 'rebel' },
  'edge_seeking+tempo':          { text: "You're a fast adventurer. 🏄",   avatar: 'explorer' },

  // builder / systems
  'agency+systems':              { text: "You're a calm strategist. ♟",    avatar: 'strategist' },
  'openness+systems':            { text: "You're a curious builder. 🛠",   avatar: 'builder' },
  'communion+systems':           { text: "You're a tribe-builder. 🤝",     avatar: 'builder' },
  'service+systems':             { text: "You're a quiet engineer. ⚙️",    avatar: 'strategist' },

  // social / expression
  'communion+expression':        { text: "You're a magnetic connector. 🌟", avatar: 'influencer' },
  'expression+openness':         { text: "You're a free creative. 🎨",     avatar: 'child' },
  'agency+expression':           { text: "You're a vocal builder. 🎤",     avatar: 'influencer' },
  'expression+tempo':            { text: "You're a high-energy performer. ✨", avatar: 'influencer' },

  // service
  'communion+service':           { text: "You're a generous host. 🤝",     avatar: 'coach' },
  'openness+service':            { text: "You're a curious helper. 🌱",    avatar: 'teacher' },

  // misc common pairings
  'communion+openness':          { text: "You're a curious connector. 🌸", avatar: 'coach' },
  'openness+tempo':              { text: "You're a restless explorer. 🗺", avatar: 'explorer' },
  'agency+communion':            { text: "You're a tribe-driver. 🚀",      avatar: 'coach' },
  'agency+openness':             { text: "You're a curious doer. ⚡",      avatar: 'visionary' },
  'agency+tempo':                { text: "You're a relentless mover. 🔥",  avatar: 'rebel' },
  'communion+status_orientation':{ text: "You're a high-status host. 🥂",  avatar: 'influencer' },
  'status_orientation+systems':  { text: "You're an ambitious builder. 📈", avatar: 'strategist' },
}

/**
 * Top-1-dim fallback. Used when the top-2 pair isn't in the dict.
 * One line per dim, so we always have something to say.
 */
const SINGLE_DIM_TAGLINES: Record<PersonalityDim, Line> = {
  openness:           { text: "You're a curious soul. 🌱",      avatar: 'visionary' },
  embodiment:         { text: "You're a body-first being. 🌊",  avatar: 'wonderwoman' },
  edge_seeking:       { text: "You're an edge-walker. 🔥",      avatar: 'rebel' },
  stillness:          { text: "You're a quiet one. 🧘",         avatar: 'healer' },
  expression:         { text: "You're a creative voice. 🎨",    avatar: 'child' },
  systems:            { text: "You're a builder mind. 🛠",      avatar: 'builder' },
  communion:          { text: "You're a community heart. 🤝",   avatar: 'coach' },
  service:            { text: "You're a quiet giver. ✨",       avatar: 'teacher' },
  agency:             { text: "You're a driven doer. ⚡",       avatar: 'strategist' },
  mystic:             { text: "You're an esoteric seeker. 🌙",  avatar: 'priestess' },
  tempo:              { text: "You're a fast mover. 🏄",        avatar: 'explorer' },
  status_orientation: { text: "You're a status-builder. 🌟",    avatar: 'influencer' },
}

const FLAT_FALLBACK: Line = { text: "You're one of one. ✨", avatar: 'visionary' }

/**
 * Pick a tagline from the user's 12-dim personality vector.
 *
 * Strategy:
 *  1. Find the top-2 dims by value. If their pair is in PAIR_TAGLINES, return it.
 *  2. Else if the top-1 dim is strong (≥ 0.55), return its SINGLE_DIM_TAGLINES line.
 *  3. Else (vector is flat / no dominant dim), return the generic "one of one."
 */
export function pickTagline(vec: PersonalityVec): Line {
  const sorted = (PERSONALITY_DIMS as readonly PersonalityDim[])
    .map((d) => [d, vec[d] ?? 0] as const)
    .sort(([, a], [, b]) => b - a)

  const [topDim, topVal] = sorted[0]
  const [secondDim] = sorted[1]

  // Pair lookup with sorted key (alphabetical) so we don't need both directions.
  const pairKey = [topDim, secondDim].sort().join('+')
  if (PAIR_TAGLINES[pairKey]) return PAIR_TAGLINES[pairKey]

  // Single-dim fallback — only when there's a clear leader.
  if (topVal >= 0.55) return SINGLE_DIM_TAGLINES[topDim]

  // Genuinely flat vector — generic.
  return FLAT_FALLBACK
}
