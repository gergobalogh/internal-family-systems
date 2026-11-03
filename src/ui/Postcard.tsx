import type { Picture } from './picture'

/**
 * The ending (frame A14): the meadow dims under a veil, and the picture to
 * keep rests beside the card, a little tilted, like a postcard on a table.
 * What's shown is the very image Keep this picture saves.
 */
export function Postcard({ picture }: { picture: Picture | null }) {
  return (
    <>
      <div className="ending-veil" aria-hidden="true" />
      <figure className="postcard">{picture && <img className="postcard__image" src={picture.url} alt={picture.alt} />}</figure>
    </>
  )
}
