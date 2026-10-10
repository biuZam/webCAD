"""Turns the screenshots from record-demo.ts into docs/media/demo.gif: each frame with its caption underneath,
shown for 1.4 s per `hold` unit. Needs Pillow.

    python3 scripts/demo/make-gif.py [frames-dir] [out.gif]
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FRAMES = Path(sys.argv[1] if len(sys.argv) > 1 else 'demo-frames')
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else 'docs/media/demo.gif')
WIDTH = 1200
CAPTION_H = 52
SECONDS = 1.4
BG = (30, 31, 34)
FG = (240, 240, 240)
FONTS = ['/System/Library/Fonts/Helvetica.ttc', 'DejaVuSans.ttf']


def font(size: int) -> ImageFont.FreeTypeFont:
    for name in FONTS:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default(size)


def main() -> None:
    frames = json.loads((FRAMES / 'frames.json').read_text())
    caption_font = font(24)
    images, durations = [], []
    for f in frames:
        shot = Image.open(FRAMES / f['file']).convert('RGB')
        shot = shot.resize((WIDTH, round(shot.height * WIDTH / shot.width)), Image.LANCZOS)
        canvas = Image.new('RGB', (WIDTH, shot.height + CAPTION_H), BG)
        canvas.paste(shot, (0, 0))
        draw = ImageDraw.Draw(canvas)
        draw.text((WIDTH / 2, shot.height + CAPTION_H / 2), f['caption'], font=caption_font, fill=FG, anchor='mm')
        images.append(canvas)
        durations.append(round(SECONDS * 1000 * f['hold']))
    # One shared adaptive palette keeps the UI colours stable from frame to frame.
    palette = images[0].copy()
    sample = Image.new('RGB', (WIDTH, sum(i.height for i in images)))
    y = 0
    for i in images:
        sample.paste(i, (0, y))
        y += i.height
    palette = sample.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    quantized = [i.quantize(palette=palette, dither=Image.Dither.NONE) for i in images]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    quantized[0].save(OUT, save_all=True, append_images=quantized[1:], duration=durations, loop=0, optimize=True)
    print(f'{OUT}: {len(images)} frames, {images[0].size[0]}×{images[0].size[1]}, {OUT.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
