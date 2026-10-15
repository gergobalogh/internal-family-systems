#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
root="$project_dir/../../.."
app_dir="$root/src/assets/rive"
mound_photo="$root/art/out/prop-soil-mound-1.jpg"

mkdir -p "$project_dir/assets" "$project_dir/build" "$app_dir"

# The Sprout as the app shows it, cut out by scripts/cutout-figures.py: one
# tile size and ground line for every figure, so the sizes match the map.
cp "$root/src/assets/figures/figure-sprout.webp" "$project_dir/assets/sprout.webp"
convert "$root/src/assets/figures/figure-sprout-blink.webp" \
  -crop 167x69+311+240 +repage -strip "$project_dir/assets/blink.png"
# The felt mound, cut out of its generated photo. art/out is gitignored, so
# without the photo the committed cutout is used as it is.
if [[ -f "$mound_photo" ]]; then
  python3 "$project_dir/cutout.py" "$mound_photo" "$project_dir/assets"
else
  echo "No photo in art/out; keeping assets/mound.webp"
fi

python3 "$project_dir/gen-scene.py"
rive "$project_dir" --once
cp "$project_dir/build/sprout-rise.riv" "$app_dir/sprout-rise.riv"
# The page parks the canvas and draws the shadow from this plan.
cp "$project_dir/rise.json" "$app_dir/sprout-rise.json"

echo "Built and copied $app_dir/sprout-rise.riv and sprout-rise.json"
