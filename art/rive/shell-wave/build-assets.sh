#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
root="$project_dir/../../.."
app_dir="$root/src/assets/rive"
photo="$root/art/out/figure-shell-1.jpg"
prop="$root/art/out/prop-wave-1.jpg"

mkdir -p "$project_dir/assets" "$project_dir/build" "$app_dir"

# Shell is not in the app yet, so it is cut out here by
# scripts/cutout-figures.py and cropped like a set of one; the wave is a
# generated prop (art/prompts/prop-wave.md). art/out is gitignored, so without
# the photos the committed cutouts are used as they are.
if [[ -f "$photo" && -f "$prop" ]]; then
  python3 "$project_dir/cutout.py" "$photo" "$prop" "$project_dir/assets"
else
  echo "No photos in art/out; keeping assets/shell.webp and assets/wave.webp"
fi

python3 "$project_dir/gen-scene.py"
rive "$project_dir" --once
cp "$project_dir/build/shell-wave.riv" "$app_dir/shell-wave.riv"
# The page moves the canvas across the screen from this plan.
cp "$project_dir/wave.json" "$app_dir/shell-wave.json"

echo "Built and copied $app_dir/shell-wave.riv and shell-wave.json"
