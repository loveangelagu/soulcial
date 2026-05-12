import { AvatarSprite, ARCHETYPE_IDS } from '@/lib/avatars'

/**
 * Animated hero — a pixel-art avatar walks across a stylized Canggu strip
 * with event "pins" popping in. CSS-only (per cut list, ship CSS).
 */
export function Hero() {
  return (
    <section className="relative px-6 pt-10 sm:pt-14 pb-8 sm:pb-10 text-center overflow-hidden">
      <h1 className="font-pixel text-pixel-3xl sm:text-pixel-4xl md:text-pixel-5xl text-purple-dark mb-3 sm:mb-4 leading-[0.95]">
        plan my bali week
      </h1>
      <p className="text-muted text-base sm:text-lg md:text-2xl max-w-2xl mx-auto leading-relaxed">
        tell us what you&apos;re into. we&apos;ll plan a week that actually fits
        your vibe.
      </p>

      {/* Canggu strip */}
      <div className="relative mt-6 sm:mt-10 mx-auto max-w-3xl h-24 sm:h-32 md:h-36 rounded-3xl border-[3px] border-lavender-pale shadow-card overflow-hidden bg-gradient-to-b from-[#fef3e8] via-[#fde68a]/40 to-[#a7f3d0]/50">
        {/* sun */}
        <div className="absolute top-3 right-6 w-8 h-8 rounded-full bg-[#fbbf24] shadow-[0_0_18px_4px_rgba(251,191,36,0.5)]" />
        {/* venue rectangles (Canggu stops) */}
        <Stop label="Echo Beach" x="6%"  color="#bae6fd" />
        <Stop label="Berawa"     x="28%" color="#fed7aa" />
        <Stop label="Old Mans"   x="50%" color="#fbcfe8" />
        <Stop label="Pererenan"  x="72%" color="#ddd6fe" />
        <Stop label="Batu Bolong" x="90%" color="#bbf7d0" />
        {/* event pins */}
        <Pin x="14%" delay="0.3s" />
        <Pin x="36%" delay="0.9s" />
        <Pin x="58%" delay="1.5s" />
        <Pin x="80%" delay="2.1s" />
        {/* walking avatar */}
        <div className="absolute bottom-1 hero-walk">
          <AvatarSprite archetype={ARCHETYPE_IDS[5]} size={48} />
        </div>
      </div>

      <style jsx>{`
        @keyframes walk {
          0%   { left: -50px; }
          100% { left: calc(100% + 50px); }
        }
        @keyframes pop {
          0%   { transform: translate(-50%, 8px) scale(0); opacity: 0; }
          70%  { transform: translate(-50%, -2px) scale(1.15); opacity: 1; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }
        .hero-walk {
          animation: walk 7s linear infinite;
          image-rendering: pixelated;
        }
      `}</style>
    </section>
  )
}

function Stop({ label, x, color }: { label: string; x: string; color: string }) {
  return (
    <div
      className="absolute bottom-3 -translate-x-1/2 flex flex-col items-center"
      style={{ left: x }}
    >
      <div
        className="w-12 h-7 rounded-md border-2 border-purple-dark/30"
        style={{ background: color }}
      />
      <span className="font-pixel text-pixel-sm text-purple-dark/80 mt-1">{label}</span>
    </div>
  )
}

function Pin({ x, delay }: { x: string; delay: string }) {
  return (
    <div
      className="absolute top-6 -translate-x-1/2 hero-pin"
      style={{ left: x, animationDelay: delay }}
    >
      <div className="w-4 h-4 rounded-full bg-pink shadow-[0_2px_0_0_#f472b6] flex items-center justify-center">
        <span className="text-[8px]">✨</span>
      </div>
      <style jsx>{`
        .hero-pin {
          animation: pop 0.6s ease-out backwards;
        }
      `}</style>
    </div>
  )
}
