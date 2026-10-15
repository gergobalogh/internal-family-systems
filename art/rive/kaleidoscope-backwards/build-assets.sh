#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
root="$project_dir/../../.."
app_dir="$root/src/assets/rive"
photo="$root/art/out/figure-kaleidoscope-1.jpg"
# Generated edits of it: the scope halfway down and lowered, and the lowered
# pose with its eyes shut.
halfway="$root/art/out/figure-kaleidoscope-halfway-1.jpg"
lowered="$root/art/out/figure-kaleidoscope-lowered-1.jpg"
closed="$root/art/out/figure-kaleidoscope-lowered-blink-1.jpg"

mkdir -p "$project_dir/assets" "$project_dir/build" "$app_dir"

# The Kaleidoscope is not in the app yet, so it is cut out here by
# scripts/cutout-figures.py and cropped like a set of one, in all three poses,
# with the closed-eye overlay for the lowered one. art/out is gitignored, so
# without the photos the committed assets are used as they are.
if [[ -f "$photo" && -f "$halfway" && -f "$lowered" && -f "$closed" ]]; then
  python3 "$project_dir/cutout.py" "$photo" "$project_dir/assets" "$halfway" "$lowered" "$closed"
elif [[ -f "$photo" ]]; then
  python3 "$project_dir/cutout.py" "$photo" "$project_dir/assets"
  echo "No other poses in art/out; keeping their assets and blink.png"
else
  echo "No photo in art/out; keeping the assets as they are"
fi

python3 "$project_dir/gen-scene.py"
rive "$project_dir" --once
cp "$project_dir/build/kaleidoscope-backwards.riv" "$app_dir/kaleidoscope-backwards.riv"
# The page moves the canvas across the screen from this plan.
cp "$project_dir/wander.json" "$app_dir/kaleidoscope-backwards.json"

echo "Built and copied $app_dir/kaleidoscope-backwards.riv and kaleidoscope-backwards.json"
