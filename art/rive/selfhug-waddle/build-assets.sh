#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
root="$project_dir/../../.."
app_dir="$root/src/assets/rive"
photo="$root/art/out/figure-self-hug-1.jpg"

mkdir -p "$project_dir/assets" "$project_dir/build" "$app_dir"

# Self-hug is not in the app yet, so it is cut out here (scripts/cutout-figures.py
# plus a clean-up round the feet) and cropped like a set of one. art/out is
# gitignored, so without the photo the committed cutout is used as it is.
if [[ -f "$photo" ]]; then
  python3 "$project_dir/cutout.py" "$photo" "$project_dir/assets"
else
  echo "No photo in art/out; keeping assets/selfhug.webp"
fi

# The closed-eye overlay: the eyes of a generated edit
# (art/prompts/figure-self-hug-blink.md), cut and cropped like the figure.
# AI Studio declined the whole figure with its eyes shut, so the edit is of a
# close-up of its face, the photo's box 465,290,645,470 scaled up to 1024:
#   art/out/figure-self-hug-face.png -> art/out/figure-self-hug-blink-face-1.jpg
# Without the photos the committed blink.png is used as it is.
closed="$root/art/out/figure-self-hug-blink-face-1.jpg"
if [[ -f "$photo" && -f "$closed" ]]; then
  python3 "$root/scripts/blink-overlay.py" --from 465,290,645,470 "$project_dir/cutout.py" "$photo" "$closed" \
    "$project_dir/assets/blink.png" 298,111,160,72 491,380,541,420 575,397,612,433
else
  echo "No closed-eye edit in art/out; keeping assets/blink.png"
fi

python3 "$project_dir/gen-scene.py"
rive "$project_dir" --once
cp "$project_dir/build/selfhug-waddle.riv" "$app_dir/selfhug-waddle.riv"
# The page moves the canvas across the screen from this plan.
cp "$project_dir/waddle.json" "$app_dir/selfhug-waddle.json"

echo "Built and copied $app_dir/selfhug-waddle.riv and selfhug-waddle.json"
