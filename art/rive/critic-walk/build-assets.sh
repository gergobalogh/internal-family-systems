#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
figure_dir="$project_dir/../../../src/assets/figures"
app_asset="$project_dir/../../../src/assets/rive/critic-walk.riv"
app_gait="$project_dir/../../../src/assets/rive/critic-walk.gait.json"

mkdir -p "$project_dir/assets" "$project_dir/build" "$(dirname "$app_asset")"

# The skinned figure is one texture: the body with the arm already in its rest
# pose. Cutting the arm out and rotating it separately is what put a seam at
# the shoulder; under the mesh it is just more geometry.
# The generated cutout contains a pale grass rim around the feet. Below the
# hips, fade alpha according to the material's warm-red colour difference;
# this removes the neutral grass while retaining both dark and light felt.
# The final tiny rectangle clears one disconnected five-pixel remnant. This is
# static texture cleanup, not a moving limb mask: the output remains one image.
# The 3px strip between the feet is cleared too: gen-scene.py tears the mesh
# there when the legs part, and the faint ground shadow in it would stretch
# into a line.
convert "$figure_dir/figure-lantern-base.webp" \
        -channel A \
        -fx 'j < 535 ? a : a * max(0, min(1, ((r - (g + b) / 2) - 0.09) / 0.07))' \
        +channel \
        -region 6x7+323+596 -channel A -evaluate set 0 +channel +region \
        -region 3x56+272+556 -channel A -evaluate set 0 +channel +region \
        "$figure_dir/figure-lantern-arm.webp" \
        -compose over -composite \
        "$project_dir/assets/critic.png"

# The photo shades the far leg and leaves a pale rim on the near one; once the
# legs walk, both travel with them. See retouch-legs.py.
python3 "$project_dir/retouch-legs.py" "$project_dir/assets/critic.png"

# The closed-eye overlay stays its own image: it fades in over the face, so it
# has no business being part of the deformable mesh.
convert "$figure_dir/figure-lantern-blink.webp" -trim +repage \
        "$project_dir/assets/blink.png"

python3 "$project_dir/gen-scene.py"
rive "$project_dir" --once
cp "$project_dir/build/critic-walk.riv" "$app_asset"
# The page moves the figure at the speed the gait was planned for.
cp "$project_dir/gait.json" "$app_gait"

echo "Built and copied $app_asset and $app_gait"
