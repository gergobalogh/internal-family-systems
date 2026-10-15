#!/usr/bin/env python3
"""Cut Doodle out of its white background.

    python3 cutout.py FIGURE.jpg OUT_DIR

All of the cutting is `cut()` in scripts/cutout-figures.py, where Doodle is
opted in to PALE_FELT and BAND_FELT (the cream pad on its lap, whose edge
comes down into the bottom fifth), ENCLOSED (the shaded backdrop between the
pad and its leg), FLOOR_GLARE and DEFRINGE. It is not in the app yet, so the
tile is cropped here, the way that script crops a set of one: a 640 box, its
lowest point at 95% of its height.
"""
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('cutout_figures', ROOT / 'scripts' / 'cutout-figures.py')
cutout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cutout)


def figure_tile(path: Path):
    img = cutout.cut(path)
    left, top, right, bottom = img.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
    side = max(right - left, bottom - top) * cutout.PADDING
    cx = (left + right) / 2
    region = (
        round(cx - side / 2),
        round(bottom - side * cutout.GROUND),
        round(cx + side / 2),
        round(bottom - side * cutout.GROUND + side),
    )
    return img.crop(region).resize((cutout.SIZE, cutout.SIZE), cutout.Image.LANCZOS)


def main() -> None:
    figure, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    figure_tile(figure).save(out_dir / 'doodle.webp', 'WEBP', quality=90, method=6)


if __name__ == '__main__':
    main()
