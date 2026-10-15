#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
root="$project_dir/../../.."
app_dir="$root/src/assets/rive"
figure_photo="$root/art/out/figure-defender-1.jpg"
canopy_photo="$root/art/out/prop-parachute-1.jpg"

mkdir -p "$project_dir/assets" "$project_dir/build" "$app_dir"

# The Defender and the felt canopy, cut out of their generated photos. art/out
# is gitignored, so without the photos the committed cutouts are used as they are.
if [[ -f "$figure_photo" && -f "$canopy_photo" ]]; then
  python3 "$project_dir/cutout.py" "$figure_photo" "$canopy_photo" "$project_dir/assets"
else
  echo "No photos in art/out; keeping assets/defender.webp and assets/canopy.webp"
fi

python3 "$project_dir/gen-scene.py"
rive "$project_dir" --once
cp "$project_dir/build/defender-parachute.riv" "$app_dir/defender-parachute.riv"
# The page moves the canvas and times the landing from this plan.
cp "$project_dir/parachute.json" "$app_dir/defender-parachute.json"

echo "Built and copied $app_dir/defender-parachute.riv and defender-parachute.json"
