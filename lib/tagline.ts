import type { PersonalityVec } from './personality/vector'
import type { ArchetypeId } from './avatars'

const TAGLINES: Record<string, { text: string; avatar: ArchetypeId }> = {
  'stillness+service':       { text: "You're a quiet healer. ✨",         avatar: 'healer' },
  'mystic+embodiment':       { text: "You're an embodied seer. 🌙",        avatar: 'priestess' },
  'edge_seeking+agency':     { text: "You're a wild builder. 🔥",          avatar: 'rebel' },
  'systems+agency':          { text: "You're a calm strategist. ♟",        avatar: 'strategist' },
  'expression+communion':    { text: "You're a magnetic connector. 🌟",    avatar: 'influencer' },
  'openness+mystic':         { text: "You're a curious mystic. 🔮",        avatar: 'visionary' },
  'service+communion':       { text: "You're a generous host. 🤝",         avatar: 'coach' },
  'embodiment+edge_seeking': { text: "You're a brave body. 🌊",            avatar: 'wonderwoman' },
  'systems+openness':        { text: "You're a curious builder. 🛠",       avatar: 'builder' },
  'expression+openness':     { text: "You're a free creative. 🎨",         avatar: 'child' },
  'communion+service':       { text: "You're a quiet teacher. 📚",         avatar: 'teacher' },
  'tempo+openness':          { text: "You're a restless explorer. 🗺",     avatar: 'explorer' },
}

export function pickTagline(vec: PersonalityVec): { text: string; avatar: ArchetypeId } {
  const sorted = Object.entries(vec)
    .sort(([, a], [, b]) => b - a)
    .map(([k]) => k)
  const top = `${sorted[0]}+${sorted[1]}`
  const reverse = `${sorted[1]}+${sorted[0]}`
  return TAGLINES[top] ?? TAGLINES[reverse] ?? {
    text: "You're one of one. ✨",
    avatar: 'visionary',
  }
}
