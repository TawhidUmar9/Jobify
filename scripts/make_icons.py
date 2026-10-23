# Generates Jobify icons: white briefcase + AI spark on GitHub blue (#0969da).
import sys
from PIL import Image, ImageDraw
S = 4  # supersampling
BLUE = (9, 105, 218, 255)

def glyph_mask(size, scale=1.0, dx=0, dy=0):
    """L-mode mask (255 = glyph) of briefcase + spark on a 1024 design grid."""
    N = 1024 * S
    m = Image.new('L', (N, N), 0)
    d = ImageDraw.Draw(m)
    def P(v): return int(((v - 512) * scale + 512 + 0) * S)
    def X(v): return int(((v - 512) * scale + 512 + dx) * S)
    def Y(v): return int(((v - 512) * scale + 512 + dy) * S)
    # handle (stroked rounded rect)
    d.rounded_rectangle([X(400), Y(290), X(624), Y(450)], radius=int(56*scale*S), outline=255, width=int(46*scale*S))
    # body
    d.rounded_rectangle([X(250), Y(400), X(774), Y(770)], radius=int(64*scale*S), fill=255)
    # lid seam (cut)
    d.rectangle([X(250), Y(548), X(774), Y(576)], fill=0)
    # clasp
    d.rounded_rectangle([X(472), Y(520), X(552), Y(610)], radius=int(18*scale*S), fill=255)
    d.rounded_rectangle([X(490), Y(538), X(534), Y(592)], radius=int(10*scale*S), fill=0)
    # spark (4-point concave star), top-right
    def star(cx, cy, r, k=0.24):
        pts = []
        import math
        for i in range(8):
            a = math.pi / 4 * i - math.pi / 2
            rr = r if i % 2 == 0 else r * k
            pts.append((X(cx + rr * math.cos(a)), Y(cy + rr * math.sin(a))))
        return pts
    # cut a ring around the spark so it reads separately from the body
    d.polygon(star(792, 318, 150, 0.30), fill=0)
    d.polygon(star(792, 318, 118), fill=255)
    d.polygon(star(700, 230, 46), fill=255)
    return m.resize((size, size), Image.LANCZOS)

def solid(size, color):
    return Image.new('RGBA', (size, size), color)

def compose(bg, mask, color):
    layer = Image.new('RGBA', bg.size, color)
    out = bg.copy(); out.paste(layer, (0, 0), mask); return out

out = sys.argv[1]
W = (255, 255, 255, 255)
T = (0, 0, 0, 0)
# 1. icon.png: full-bleed blue square, glyph ~70%
compose(solid(1024, BLUE), glyph_mask(1024, 0.86), W).save(f'{out}/icon.png')
# 2. adaptive foreground: transparent, glyph inside the 66% safe zone
compose(solid(1024, T), glyph_mask(1024, 0.72), W).save(f'{out}/android-icon-foreground.png')
# 3. adaptive background: solid blue
solid(1024, BLUE).save(f'{out}/android-icon-background.png')
# 4. monochrome (themed icons): white glyph on transparent, same safe zone
compose(solid(1024, T), glyph_mask(1024, 0.72), W).save(f'{out}/android-icon-monochrome.png')
# 5. splash: blue glyph on transparent (splash bg comes from app.json)
compose(solid(1024, T), glyph_mask(1024, 0.9), BLUE).save(f'{out}/splash-icon.png')
# 6. favicon 48px
compose(solid(48, BLUE), glyph_mask(48, 0.86), W).save(f'{out}/favicon.png')
print('ok')
