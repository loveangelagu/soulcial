import { INTERESTS } from '@/lib/interests'

export function InterestPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else onChange([...selected, id])
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {INTERESTS.map((i) => {
        const on = selected.includes(i.id)
        return (
          <button
            key={i.id}
            onClick={() => toggle(i.id)}
            className={[
              'px-4 py-2 rounded-full border-2 font-sans text-sm transition-all',
              on
                ? 'bg-purple-primary text-white border-purple-deep shadow-[0_2px_0_0_#4a2a8a]'
                : 'bg-paper text-ink border-lavender-pale hover:border-purple-primary hover:bg-lavender-light',
            ].join(' ')}
          >
            <span className="mr-1">{i.emoji}</span>
            {i.label}
          </button>
        )
      })}
    </div>
  )
}
