export type VibeSliders = {
  tempo: number    // 0..1, low = slow/restful, high = fast/active
  social: number   // 0..1, low = solo, high = crowd
  stretch: number  // 0..1, low = comfort, high = adventurous
}

export const DEFAULT_SLIDERS: VibeSliders = { tempo: 0.5, social: 0.5, stretch: 0.5 }

export function VibeSlidersUI({
  values,
  onChange,
}: {
  values: VibeSliders
  onChange: (next: VibeSliders) => void
}) {
  const set = (key: keyof VibeSliders) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...values, [key]: Number(e.target.value) })

  return (
    <div className="flex flex-col gap-5 w-full max-w-md">
      <Slider
        leftIcon="🧘" leftLabel="slow"
        rightIcon="🔥" rightLabel="fast"
        value={values.tempo} onChange={set('tempo')}
      />
      <Slider
        leftIcon="🌱" leftLabel="solo"
        rightIcon="🎉" rightLabel="social"
        value={values.social} onChange={set('social')}
      />
      <Slider
        leftIcon="🛋️" leftLabel="comfort"
        rightIcon="🚀" rightLabel="stretch"
        value={values.stretch} onChange={set('stretch')}
      />
    </div>
  )
}

function Slider({
  leftIcon, leftLabel, rightIcon, rightLabel, value, onChange,
}: {
  leftIcon: string; leftLabel: string
  rightIcon: string; rightLabel: string
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted mb-1.5">
        <span>{leftIcon} {leftLabel}</span>
        <span>{rightLabel} {rightIcon}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={onChange}
        className="w-full h-2 rounded-full appearance-none bg-lavender-pale accent-purple-deep cursor-pointer"
      />
    </div>
  )
}
