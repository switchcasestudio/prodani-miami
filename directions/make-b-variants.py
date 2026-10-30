"""Derive the Flavor Drop variants (B2, B3, F) from b-flavor-drop/index.html.
B2 (soft) and B3 (quiet) keep B's layout and style.css and add an override sheet;
this script copies the base files and strips the louder elements from the markup.
Run from directions/: python3 make-b-variants.py"""
import re, shutil

BASE = 'b-flavor-drop/index.html'
STYLE = 'b-flavor-drop/style.css'


def strip_common(s):
    s = re.sub(r'<div class="mq" aria-hidden="true">.*?</div></div>\n', '', s, flags=re.S)   # marquee
    s = re.sub(r'<i class="crumb c\d"></i>', '', s)                                            # crumbs
    s = s.replace('<div class="baker__stamp">Baked by<br>Daniel<br>in Miami</div>', '')
    s = s.replace('<img class="macro__cake" src="../assets/cut/pistachio.png" alt="">', '')
    s = s.replace('<a class="pill pill--pink" href="#">Shop the 5-pack · $42.99</a>', '<a class="pill" href="#">Shop the 5-pack · $42.99</a>')
    return s


# ---- B2 · soft ----
shutil.copy(STYLE, 'b2-flavor-soft/style.css')
s = strip_common(open(BASE).read())
s = s.replace('<title>Direction B — Flavor Drop · prodani</title>', '<title>Direction B2 — Flavor Drop · Soft · prodani</title>')
s = s.replace('<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="soft.css">')
s = s.replace('<div class="hero__ring"></div><div class="hero__halo"></div>', '<div class="hero__halo"></div>')
s = s.replace('<div class="hero__sticker"><div><b>7</b>flavors<br>baked weekly</div></div>', '<span class="hero__sticker badge badge--white">7 flavors · baked weekly</span>')
open('b2-flavor-soft/index.html', 'w').write(s)

# ---- B3 · quiet ----
shutil.copy(STYLE, 'b3-flavor-quiet/style.css')
s = strip_common(open(BASE).read())
s = s.replace('<title>Direction B — Flavor Drop · prodani</title>', '<title>Direction B3 — Flavor Drop · Quiet · prodani</title>')
s = s.replace('<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@500;700;800&display=swap" rel="stylesheet">',
              '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">')
s = s.replace('<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="quiet.css">')
s = s.replace('<div class="hero__ring"></div><div class="hero__halo"></div>', '')
s = s.replace('<div class="hero__sticker"><div><b>7</b>flavors<br>baked weekly</div></div>', '')
s = s.replace('<span class="badge badge--white">20g protein · 170 cal</span>', '<span class="badge badge--white">20g protein · 170 cal · gluten free</span>')
# flavour colour survives only as a dot before the name
s = re.sub(r'<div class="fc__name">([^<]+)<em>([^<]+)</em></div>', r'<div class="fc__name"><i class="dot"></i>\1<em>\2</em></div>', s)
open('b3-flavor-quiet/index.html', 'w').write(s)
# ---- F · catering look (from Dani's catering flyer) ----
shutil.copy(STYLE, 'f-catering-look/style.css')
s = strip_common(open(BASE).read())
s = s.replace('<title>Direction B — Flavor Drop · prodani</title>', '<title>Direction F — Catering Look · prodani</title>')
s = s.replace('<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="catering.css">')
s = s.replace('<div class="hero__ring"></div><div class="hero__halo"></div>', '')
s = s.replace('<div class="hero__sticker"><div><b>7</b>flavors<br>baked weekly</div></div>', '')
s = re.sub(r'<div class="hero__dots">.*?</div>\n', '', s, flags=re.S)
s = re.sub(r'<a class="hero__next[^>]*>.*?</a>\n', '', s)
s = s.replace('<h1 class="disp hero__h">Cherry<br><em>White</em></h1>', '<h1 class="disp hero__h">Cake first.<br>Protein too.</h1>')
s = s.replace('<span class="badge">Flavor of the week</span>', '<span class="badge">Personal protein cakes</span>')
s = s.replace('<h2 class="disp how__h">Cake, the easy way.</h2>', '<h2 class="disp how__h">Pick it. Warm it.<br>Make it yours.</h2>')
# the flyer's numbered "01 / Label" headings
n = [0]
def number(m):
    n[0] += 1
    return '%s%02d / %s</span>' % (m.group(1), n[0], m.group(2))
s = re.sub(r'(<span class="eyebrow"[^>]*>)([^<]+)</span>', number, s)
open('f-catering-look/index.html', 'w').write(s)
print('b2 + b3 + f written')
