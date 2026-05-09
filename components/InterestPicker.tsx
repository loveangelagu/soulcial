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
    <div className="flex flex-wrap gap-3 justify-center">
      {INTERESTS.map((i) => {
        const on = selected.includes(i.id)
        return (
          <button
            key={i.id}
            onClick={() => toggle(i.id)}
            className={[
              'px-5 py-3 rounded-full border-[3px] font-sans text-lg transition-all inline-flex items-center gap-2',
              on
                ? 'bg-purple-primary text-white border-purple-deep shadow-press'
                : 'bg-paper text-ink border-lavender-pale hover:border-purple-primary hover:bg-lavender-light',
            ].join(' ')}
          >
            <span className="text-xl leading-none">{i.emoji}</span>
            <span>{i.label}</span>
          </button>
        )
      })}
    </div>
  )
}
