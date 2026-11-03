import dayLarge from '../assets/world/world-day-2752.webp'
import daySmall from '../assets/world/world-day-1600.webp'
import duskLarge from '../assets/world/world-dusk-2752.webp'
import duskSmall from '../assets/world/world-dusk-1600.webp'

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

/** Overlays shared by both layers: film grain and a soft, warm vignette. */
export function Atmosphere() {
  return <div className="atmosphere" aria-hidden="true" />
}
