#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
root="$project_dir/../../.."
app_dir="$root/src/assets/rive"
photo="$root/art/out/figure-pod-1.jpg"

mkdir -p "$project_dir/assets" "$project_dir/build" "$app_dir"

# The Pod is not in the app yet, so it is cut out here, cropped like a set of
# one in scripts/cutout-figures.py. art/out is gitignored, so without the
# photo the committed cutout is used as it is.
if [[ -f "$photo" ]]; then
  python3 "$project_dir/cutout.py" "$photo" "$project_dir/assets"
else
  echo "No photo in art/out; keeping assets/pod.webp"
fi

# The closed-eye overlay: the eyes of a generated edit
# (art/prompts/figure-pod-blink.md), cut and cropped like the figure.
# Without the photos the committed blink.png is used as it is.
closed="$root/art/out/figure-pod-blink-1.jpg"
if [[ -f "$photo" && -f "$closed" ]]; then
  python3 "$root/scripts/blink-overlay.py" "$project_dir/cutout.py" "$photo" "$closed" \
    "$project_dir/assets/blink.png" 255,119,179,106 460,392,522,466 551,404,594,444
else
  echo "No closed-eye edit in art/out; keeping assets/blink.png"
fi

python3 "$project_dir/gen-scene.py"
rive "$project_dir" --once
cp "$project_dir/build/pod-drop.riv" "$app_dir/pod-drop.riv"
# The page drops the canvas and times the contact from this plan.
cp "$project_dir/drop.json" "$app_dir/pod-drop.json"

echo "Built and copied $app_dir/pod-drop.riv and pod-drop.json"
