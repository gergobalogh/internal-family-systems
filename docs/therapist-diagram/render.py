#!/usr/bin/env python3
"""Render how-it-works.mmd to how-it-works.png, with the felt figures.

In the .mmd, {{fig:map:90}} stands for the Map figure at 90 px wide. The
figures are inlined as data URIs (the Mermaid CLI can't load local files),
into a temporary copy that is rendered and then deleted.

Run from anywhere: python3 docs/therapist-diagram/render.py
Needs Pillow and npx; set CHROME to a Chrome/Chromium binary if Puppeteer
has none of its own.
"""
import base64, io, json, os, re, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

here = Path(__file__).resolve().parent
figures = here.parent.parent / 'src/assets/figures'


def figure(match: re.Match) -> str:
    name, width = match.group(1), int(match.group(2))
    img = Image.open(figures / f'figure-{name}.webp').convert('RGBA')
    img = img.crop(img.getbbox())  # trim the empty margin
    w = width * 2  # rendered at scale 2
    img = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, 'WEBP', quality=90)
    data = base64.b64encode(buf.getvalue()).decode()
    height = round(img.height / 2)
    # A sized span with a background image: Mermaid stretches <img> tags to
    # the label's width, but leaves spans alone.
    return (f"<span style='display:inline-block;width:{width}px;height:{height}px;margin:4px 6px 0;"
            f"background:url(data:image/webp;base64,{data}) center/contain no-repeat'></span>")


source = (here / 'how-it-works.mmd').read_text()
inlined = re.sub(r'\{\{fig:([a-z]+):(\d+)\}\}', figure, source)

with tempfile.TemporaryDirectory() as tmp:
    mmd = Path(tmp) / 'diagram.mmd'
    mmd.write_text(inlined)
    cmd = ['npx', '-y', '@mermaid-js/mermaid-cli@11.4.2', '-i', str(mmd),
           '-o', str(here / 'how-it-works.png'), '-s', '2', '-b', 'white']
    cfg_mermaid = Path(tmp) / 'mermaid.json'
    cfg_mermaid.write_text(json.dumps({'maxTextSize': 5_000_000}))
    cmd += ['-c', str(cfg_mermaid)]
    if os.environ.get('CHROME'):
        cfg = Path(tmp) / 'puppeteer.json'
        cfg.write_text(json.dumps({'executablePath': os.environ['CHROME'], 'args': ['--no-sandbox']}))
        cmd += ['-p', str(cfg)]
    sys.exit(subprocess.run(cmd, env={**os.environ, 'PUPPETEER_SKIP_DOWNLOAD': '1'}).returncode)
