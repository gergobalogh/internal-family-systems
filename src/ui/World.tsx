import dayLarge from '../assets/world/world-day-2752.webp'
import daySmall from '../assets/world/world-day-1600.webp'
import duskLarge from '../assets/world/world-dusk-2752.webp'
import duskSmall from '../assets/world/world-dusk-1600.webp'
import { copy } from './copy'

/**
 * The world layer: one place whose light changes with the mode — the meadow
 * by day ("How it is") and the same meadow at dusk ("What if…"). The two
 * plates share one composition (the dusk one is an edit of the day one), so
 * crossfading them reads as re-lighting, not a scene change.
 *
 * The plates sit in a frame sized like the image (see `.world__frame`), so
 * the house and the pool of light have known places that other layers (the
 * waiting light, the conversation card) can line up with.
 *
 * The clouds drift slowly to the right, always. While the person waits on
 * the conversation, the world waits with them: the pool of light breathes.
 * One idea, world only; under reduced motion it stays still and the card
 * carries the meaning.
 */
export function World({ waiting = false }: { waiting?: boolean }) {
  return (
    <div className={`world${waiting ? ' is-waiting' : ''}`} aria-hidden="true">
      <div className="world__frame">
        <Plate small={daySmall} large={dayLarge} />
        <Plate small={duskSmall} large={duskLarge} className="world__plate--dusk" />
        {/* The same plates again, masked to the sky, tiled three wide and drifting right. */}
        <div className="world__sky">
          <div className="world__drift">
            <SkyTile />
            <SkyTile mirrored />
            <SkyTile />
          </div>
        </div>
        <div className="world__pool" />
      </div>
    </div>
  )
}

/**
 * One plate-sized tile of sky. Every other tile is mirrored, so neighbours
 * meet edge to edge on the same column of pixels and the seams don't show.
 */
function SkyTile({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <div className={`world__tile${mirrored ? ' world__tile--mirrored' : ''}`}>
      <Plate small={daySmall} large={dayLarge} />
      <Plate small={duskSmall} large={duskLarge} className="world__plate--dusk" />
    </div>
  )
}

function Plate({ small, large, className = '' }: { small: string; large: string; className?: string }) {
  return (
    <img
      className={`world__plate ${className}`}
      src={small}
      srcSet={`${small} 1600w, ${large} 2752w`}
      // The frame's width: the plate covers wide screens, is scaled to the
      // height on squarer ones, and zoomed in on tall ones (see app.css).
      sizes="(max-aspect-ratio: 9/10) 300vh, (max-aspect-ratio: 16/9) 180vh, 100vw"
      alt=""
      draggable={false}
    />
  )
}

/** "What if…" staging: curtains part on the same place, a moon hangs on a thread. */
export function Curtains() {
  return (
    <div className="curtains" aria-hidden="true">
      <CurtainDefs />
      <Curtain side="left" />
      <Curtain side="right" />
      <div className="moon-prop">
        <span className="moon-prop__moon" />
      </div>
      <svg className="valance" viewBox="0 0 1000 60" preserveAspectRatio="none">
        <path d={valancePath()} fill="url(#velvet-swag)" />
        <path d={valancePath()} fill="url(#velvet-shade)" />
      </svg>
      <span className="curtains__tag">{copy.modes.whatIf.title}</span>
    </div>
  )
}

/** Overlays shared by both layers: film grain and a soft, warm vignette. */
export function Atmosphere() {
  return <div className="atmosphere" aria-hidden="true" />
}

function Curtain({ side }: { side: 'left' | 'right' }) {
  return (
    <svg className={`curtain curtain--${side}`} viewBox="0 0 100 1000" preserveAspectRatio="none">
      <path d="M0 0 H100 C96 260 80 500 54 630 C66 720 84 860 98 1000 H0 Z" fill="url(#velvet)" />
      <path d="M0 0 H100 C96 260 80 500 54 630 C66 720 84 860 98 1000 H0 Z" fill="url(#velvet-depth)" />
      <path d="M0 622 L56 626 L57 640 L0 644 Z" fill="#d9b37a" />
    </svg>
  )
}

function valancePath(): string {
  const swags = 8
  const width = 1000 / swags
  let d = 'M0 0 H1000 V26'
  for (let i = swags; i > 0; i--) {
    const x = i * width
    d += ` Q${x - width / 2} 66 ${x - width} 26`
  }
  return `${d} Z`
}

function CurtainDefs() {
  return (
    <svg className="svg-defs">
      <defs>
        {/* Velvet folds: a repeating fold gradient, stretched vertically. */}
        <linearGradient id="velvet" x1="0" y1="0" x2="0.24" y2="0" spreadMethod="repeat">
          <stop offset="0" stopColor="#93606d" />
          <stop offset="0.3" stopColor="#c48b90" />
          <stop offset="0.5" stopColor="#e0aea9" />
          <stop offset="0.7" stopColor="#c48b90" />
          <stop offset="1" stopColor="#93606d" />
        </linearGradient>
        <linearGradient id="velvet-depth" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b2236" stopOpacity="0.28" />
          <stop offset="0.6" stopColor="#3b2236" stopOpacity="0" />
          <stop offset="1" stopColor="#3b2236" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id="velvet-swag" x1="0" y1="0" x2="0.125" y2="0" spreadMethod="repeat">
          <stop offset="0" stopColor="#8d5a68" />
          <stop offset="0.5" stopColor="#d7a3a2" />
          <stop offset="1" stopColor="#8d5a68" />
        </linearGradient>
        <linearGradient id="velvet-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b2236" stopOpacity="0.25" />
          <stop offset="0.5" stopColor="#3b2236" stopOpacity="0" />
          <stop offset="1" stopColor="#3b2236" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  )
}
