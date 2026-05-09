import data from './interests-curated.json'

export type Interest = { id: string; label: string; emoji: string }

export const INTERESTS: Interest[] = data
