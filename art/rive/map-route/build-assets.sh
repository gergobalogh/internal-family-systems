#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
root="$project_dir/../../.."
app_dir="$root/src/assets/rive"
photo="$root/art/out/figure-map-1.jpg"

mkdir -p "$project_dir/assets" "$project_dir/build" "$app_dir"

# Map is not in the app yet, so it is cut out here by
# scripts/cutout-figures.py and cropped like a set of one. art/out is
# gitignored, so without the photo the committed cutout is used as it is.
if [[ -f "$photo" ]]; then
  python3 "$project_dir/cutout.py" "$photo" "$project_dir/assets"
else
  echo "No photo in art/out; keeping assets/map.webp"
fi

# The closed-eye overlay: the eyes of a generated edit
# (art/prompts/figure-map-blink.md), cut and cropped like the figure.
# Without the photos the committed blink.png is used as it is.
closed="$root/art/out/figure-map-blink-1.jpg"
if [[ -f "$photo" && -f "$closed" ]]; then
  python3 "$root/scripts/blink-overlay.py" "$project_dir/cutout.py" "$photo" "$closed" \
    "$project_dir/assets/blink.png" 236,138,190,65 469,413,527,449 562,409,604,443
else
  echo "No closed-eye edit in art/out; keeping assets/blink.png"
fi

python3 "$project_dir/gen-scene.py"
rive "$project_dir" --once
cp "$project_dir/build/map-route.riv" "$app_dir/map-route.riv"
# The page walks the canvas along its route from this plan.
cp "$project_dir/route.json" "$app_dir/map-route.json"

echo "Built and copied $app_dir/map-route.riv and map-route.json"
