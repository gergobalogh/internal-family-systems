#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
root="$project_dir/../../.."
app_dir="$root/src/assets/rive"
photo="$root/art/out/figure-curled-1.jpg"

mkdir -p "$project_dir/assets" "$project_dir/build" "$app_dir"

# Curled is not in the app yet, so it is cut out here by scripts/cutout-figures.py
# and cropped like a set of one. art/out is gitignored, so without the photo
# the committed cutout is used as it is.
if [[ -f "$photo" ]]; then
  python3 "$project_dir/cutout.py" "$photo" "$project_dir/assets"
else
  echo "No photo in art/out; keeping assets/curled.webp"
fi

# The closed-eye overlay: the eyes of a generated edit
# (art/prompts/figure-curled-blink.md), cut and cropped like the figure.
# Without the photos the committed blink.png is used as it is.
closed="$root/art/out/figure-curled-blink-1.jpg"
if [[ -f "$photo" && -f "$closed" ]]; then
  python3 "$root/scripts/blink-overlay.py" "$project_dir/cutout.py" "$photo" "$closed" \
    "$project_dir/assets/blink.png" 264,91,220,100 480,434,543,481 566,431,601,466
else
  echo "No closed-eye edit in art/out; keeping assets/blink.png"
fi

python3 "$project_dir/gen-scene.py"
rive "$project_dir" --once
cp "$project_dir/build/curled-peek.riv" "$app_dir/curled-peek.riv"
# The page moves the canvas across the screen from this plan.
cp "$project_dir/peek.json" "$app_dir/curled-peek.json"

echo "Built and copied $app_dir/curled-peek.riv and curled-peek.json"
