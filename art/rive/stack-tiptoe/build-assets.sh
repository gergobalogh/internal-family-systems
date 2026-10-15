#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
root="$project_dir/../../.."
app_dir="$root/src/assets/rive"
photo="$root/art/out/figure-stack-2.jpg"

mkdir -p "$project_dir/assets" "$project_dir/build" "$app_dir"

# The Stack is not in the app yet, so it is cut out here by
# scripts/cutout-figures.py and cropped like a set of one. art/out is
# gitignored, so without the photo the committed cutout is used as it is.
if [[ -f "$photo" ]]; then
  python3 "$project_dir/cutout.py" "$photo" "$project_dir/assets"
else
  echo "No photo in art/out; keeping assets/stack.webp"
fi

# The closed-eye overlay: the eyes of a generated edit
# (art/prompts/figure-stack-blink.md), cut and cropped like the figure.
# Without the photos the committed blink.png is used as it is.
closed="$root/art/out/figure-stack-blink-1.jpg"
if [[ -f "$photo" && -f "$closed" ]]; then
  python3 "$root/scripts/blink-overlay.py" "$project_dir/cutout.py" "$photo" "$closed" \
    "$project_dir/assets/blink.png" 260,324,144,58 461,526,512,563 533,521,576,557
else
  echo "No closed-eye edit in art/out; keeping assets/blink.png"
fi

python3 "$project_dir/gen-scene.py"
rive "$project_dir" --once
cp "$project_dir/build/stack-tiptoe.riv" "$app_dir/stack-tiptoe.riv"
# The page moves the canvas across the screen from this plan.
cp "$project_dir/tiptoe.json" "$app_dir/stack-tiptoe.json"

echo "Built and copied $app_dir/stack-tiptoe.riv and stack-tiptoe.json"
