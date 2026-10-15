#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
root="$project_dir/../../.."
app_dir="$root/src/assets/rive"

mkdir -p "$project_dir/assets" "$project_dir/build" "$app_dir"

# The Sleeper as the app shows it, cut out by scripts/cutout-figures.py: one
# tile size and ground line for every figure, so the sizes match the map.
cp "$root/src/assets/figures/figure-sleeper.webp" "$project_dir/assets/sleeper.webp"
convert "$root/src/assets/figures/figure-sleeper-blink.webp" \
  -crop 68x122+232+376 +repage -strip "$project_dir/assets/blink.png"

python3 "$project_dir/gen-scene.py"
rive "$project_dir" --once
cp "$project_dir/build/sleeper-drift.riv" "$app_dir/sleeper-drift.riv"
# The page moves the canvas and times the landing from this plan.
cp "$project_dir/drift.json" "$app_dir/sleeper-drift.json"

echo "Built and copied $app_dir/sleeper-drift.riv and sleeper-drift.json"
