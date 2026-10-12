from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path('public/icons')
OUT.mkdir(parents=True, exist_ok=True)

for size, filename in [(192, 'budgital-192.png'), (512, 'budgital-512.png')]:
    image = Image.new('RGBA', (size, size), '#c8ee68')
    draw = ImageDraw.Draw(image)
    radius = round(size * 0.25)
    inset = round(size * 0.055)
    draw.rounded_rectangle((inset, inset, size - inset, size - inset), radius=radius, fill='#c8ee68')
    left = round(size * 0.28)
    baseline = round(size * 0.70)
    bar_width = round(size * 0.105)
    gap = round(size * 0.062)
    heights = [0.17, 0.30, 0.42]
    for index, height in enumerate(heights):
        x = left + index * (bar_width + gap)
        top = round(size * (0.70 - height))
        draw.rounded_rectangle((x, top, x + bar_width, baseline), radius=max(2, round(size * 0.018)), fill='#18352e')
    draw.line((round(size * 0.25), round(size * 0.79), round(size * 0.75), round(size * 0.79)), fill='#18352e', width=max(2, round(size * 0.052)), joint='curve')
    image.save(OUT / filename, optimize=True)
