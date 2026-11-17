#!/usr/bin/env python3
"""One Nutrition Facts label for every Prodani cake (the "Shtantz").

    python build_labels.py extract   # live product pages -> data/site.json
    python build_labels.py check     # Shopify vs label images + FDA math -> out/report.json
    python build_labels.py build     # -> out/<handle>.svg/.png/.alt.txt/.metafield.txt + out/review.csv

Source of truth: data/site.json (the prodani.nutrition_facts metafield as the live
product page renders it) with data/corrections.json applied on top (Dani's fixes go
there, never into the generated files). Layout: the FDA 2016 single-column label,
strict black on white, set in Archivo (the theme's own font, OFL), every glyph
converted to a path so the SVG renders the same everywhere. The label sits on a
brand-colour panel, 1600x2000 (4:5), at one fixed scale for all cakes.

Needs: fonttools + brotli (pip), Google Chrome (PNG export only).
"""
import html, json, os, re, subprocess, sys, tempfile, time, urllib.request
from functools import lru_cache

HERE = os.path.dirname(os.path.abspath(__file__))
THEME = os.path.normpath(os.path.join(HERE, '..', '..', 'prodani'))
DATA = os.path.join(HERE, 'data')
OUT = os.path.join(HERE, 'out')
FONT = os.path.join(THEME, 'assets', 'archivo-var-latin.woff2')
WORDMARK = os.path.join(THEME, 'assets', 'prodani-wordmark.svg')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
STORE = 'https://prodanimiami.com'

HANDLES = [  # shop order
    'moist-chocolate-fudge-cake-copy', 'personal-hazelnuts-cake', 'carrot-cake',
    'dubai-dream-cake-copy', 'personal-chocolate-fudge-cake-copy',
    'cinnamon-apple-cake-copy', 'banana-bread-copy',
]
CANVAS_W, CANVAS_H = 1600, 2000
PANELS = {'bone': '#F3EEE6', 'pink': '#FDC3D4'}   # prodani-tokens.css --butter / --pink
INK = '#000000'
FOOTNOTE = ('*The % Daily Value (DV) tells you how much a nutrient in a serving of food '
            'contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.')

# ---------------------------------------------------------------- nutrients
MAIN = ['Total Fat', 'Cholesterol', 'Sodium', 'Total Carbohydrate', 'Protein']
SUB = ['Saturated Fat', 'Trans Fat', 'Polyunsaturated Fat', 'Monounsaturated Fat',
       'Dietary Fiber', 'Total Sugars', 'Sugar Alcohol']
MICRO = ['Vitamin D', 'Calcium', 'Iron', 'Potassium', 'Vitamin A', 'Vitamin C']
ORDER = ['Total Fat', 'Saturated Fat', 'Trans Fat', 'Polyunsaturated Fat', 'Monounsaturated Fat',
         'Cholesterol', 'Sodium', 'Total Carbohydrate', 'Dietary Fiber', 'Total Sugars',
         'Added Sugars', 'Sugar Alcohol', 'Protein'] + MICRO
# FDA Daily Values (21 CFR 101.9, adults and children 4+)
DV = {'Total Fat': (78, 'g'), 'Saturated Fat': (20, 'g'), 'Cholesterol': (300, 'mg'),
      'Sodium': (2300, 'mg'), 'Total Carbohydrate': (275, 'g'), 'Dietary Fiber': (28, 'g'),
      'Added Sugars': (50, 'g'), 'Protein': (50, 'g'), 'Vitamin D': (20, 'mcg'),
      'Calcium': (1300, 'mg'), 'Iron': (18, 'mg'), 'Potassium': (4700, 'mg'),
      'Vitamin A': (900, 'mcg'), 'Vitamin C': (90, 'mg')}


def key(name):
    """Row name -> canonical nutrient key ('Includes 0g* Added Sugars' -> 'Added Sugars')."""
    n = name.strip()
    if n.lower().startswith('includes'):
        return 'Added Sugars'
    return n


def added_amount(name):
    m = re.search(r'Includes\s+([\d.]+\s*g)', name)
    return m.group(1).replace(' ', '') if m else ''


def num(s):
    m = re.match(r'\s*([\d.]+)', s or '')
    return float(m.group(1)) if m else None


# ---------------------------------------------------------------- extract
def extract():
    out = {}
    for h in HANDLES:
        page = urllib.request.urlopen(urllib.request.Request(
            f'{STORE}/products/{h}', headers={'User-Agent': 'Mozilla/5.0'})).read().decode()
        m = re.search(r'<table class="pd-nut__table">(.*?)</table>', page, re.S)
        if not m:
            out[h] = None
            continue
        title = html.unescape(re.search(r'Nutrition facts for (.*?)</caption>', page).group(1))
        rows = [[html.unescape(re.sub('<[^>]+>', '', th)).strip(), html.unescape(a).strip(),
                 html.unescape(d).strip()]
                for th, a, d in re.findall(
                    r'<th scope="row">(.*?)</th>\s*<td class="pd-nut__amt">(.*?)</td>\s*'
                    r'<td class="pd-nut__dv">(.*?)</td>', m.group(1), re.S)]
        serving = next((r[1] for r in rows if r[0] == 'Serving size'), '')
        out[h] = {'title': title, 'serving': serving,
                  'rows': [r for r in rows if r[0] != 'Serving size']}
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, 'site.json'), 'w') as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    print('wrote data/site.json:', ', '.join(f'{h} ({len(v["rows"]) if v else 0} rows)' for h, v in out.items()))


def load(name):
    p = os.path.join(DATA, name)
    return json.load(open(p)) if os.path.exists(p) else {}


def canonical():
    """site.json + corrections.json -> {handle: cake}. A correction row replaces the row
    with the same nutrient key, or is added; [key, null] removes it."""
    site, fix = load('site.json'), load('corrections.json')
    cakes = {}
    for h in HANDLES:
        s = site.get(h)
        if not s:
            continue
        rows = {key(r[0]): r for r in s['rows']}
        c = fix.get(h, {})
        for r in c.get('rows', []):
            if r[1] is None:
                rows.pop(key(r[0]), None)
            else:
                rows[key(r[0])] = r
        # A vitamin printed with a % but no amount: amount = % x FDA Daily Value
        # (owner decision 2026-11-17). The % is rounded on the label, so this is the amount
        # that % stands for, not a lab value.
        derived = []
        for k in MICRO:
            r = rows.get(k)
            if r and not r[1] and num(r[2]) is not None:
                v = num(r[2]) / 100 * DV[k][0]
                a = f'{v:.1f}'.rstrip('0').rstrip('.') + DV[k][1]
                rows[k] = [r[0], a, r[2]]
                derived.append(f'{k} {a} worked out from {r[2]} of the {DV[k][0]}{DV[k][1]} Daily Value')
        cal = rows.pop('Calories', ['Calories', '', ''])[1]
        ordered = [rows[k] for k in ORDER if k in rows]
        ordered += [r for k, r in rows.items() if k not in ORDER]
        cakes[h] = {'handle': h, 'title': c.get('title', s['title']),
                    'servings': c.get('servings', '1 serving per container'),
                    'serving': c.get('serving', s['serving']), 'calories': cal, 'rows': ordered,
                    'derived': derived}
    return cakes


# ---------------------------------------------------------------- check
def dv_expected(k, amount):
    """FDA rounding: macros to the nearest 1%; vitamins/minerals <=10% to 2%, <=50% to 5%, else 10%."""
    if k not in DV or amount is None:
        return None
    p = amount / DV[k][0] * 100
    if k in MICRO:
        step = 2 if p < 10 else 5 if p <= 50 else 10
        return round(p / step) * step
    return round(p)


def checks(c):
    flags = []
    r = {key(x[0]): x for x in c['rows']}
    amt = lambda k: added_amount(r[k][0]) if k == 'Added Sugars' and k in r else (r[k][1] if k in r else '')
    g = lambda k: num(amt(k))
    for k, row in r.items():
        a, d = num(amt(k)), num(row[2])
        if k in DV and a is not None and d is None and k in MAIN + ['Saturated Fat', 'Dietary Fiber', 'Added Sugars']:
            flags.append(('error', f'{k} {amt(k)} has no % Daily Value (FDA requires it). Expected {dv_expected(k, a)}%.'))
        if k in DV and a is not None and d is not None and k != 'Protein':
            e = dv_expected(k, a)
            tol = 1 if k not in MICRO else (2 if e < 10 else 5)
            if abs(e - d) > tol:
                flags.append(('error', f'{k} {amt(k)} is printed as {row[2]}; {DV[k][0]}{DV[k][1]} Daily Value gives {e}%.'))
        if k in MICRO and not amt(k):
            flags.append(('check', f'{k} shows only a % ({row[2]}) with no amount. The FDA format puts the amount next to each vitamin (e.g. "{k} 0{DV[k][1]}"); ask Dani for it.'))
    parts = [g(k) or 0 for k in ['Saturated Fat', 'Trans Fat', 'Polyunsaturated Fat', 'Monounsaturated Fat']]
    if g('Total Fat') is not None and sum(parts) > g('Total Fat') + 0.5:
        flags.append(('error', f'Fat breakdown adds up to {sum(parts):g}g (sat + trans + poly + mono) but Total Fat is {amt("Total Fat")}.'))
    carbs = sum(g(k) or 0 for k in ['Dietary Fiber', 'Total Sugars', 'Sugar Alcohol'])
    if g('Total Carbohydrate') is not None and carbs > g('Total Carbohydrate') + 0.5:
        flags.append(('error', f'Fiber + sugars + sugar alcohol = {carbs:g}g, more than Total Carbohydrate {amt("Total Carbohydrate")}.'))
    if all(g(k) is not None for k in ['Total Fat', 'Total Carbohydrate', 'Protein']) and c['calories']:
        est = 9 * g('Total Fat') + 4 * g('Total Carbohydrate') + 4 * g('Protein')
        cal = float(c['calories'])
        if abs(est - cal) / cal > 0.25:
            flags.append(('check', f'Calories {c["calories"]} vs about {est:.0f} from fat/carbs/protein (9/4/4). Fiber and sugar alcohol count less, so a gap can be fine.'))
    return flags


def compare(c, img):
    """Shopify (site) vs the current label image, row by row."""
    diffs = []
    if not img:
        return [('info', 'No label image on the product; Shopify data only.')]
    site = {key(x[0]): x for x in c['rows']}
    site['Calories'] = ['Calories', c['calories'], '']
    pic = {key(x[0]): x for x in img['rows']}
    for k in [k for k in ['Calories'] + ORDER if k in site or k in pic]:
        a, b = site.get(k), pic.get(k)
        if not b:
            diffs.append(('diff', f'{k}: in Shopify ({" ".join(filter(None, a[1:]))}) but not on the label image.'))
        elif not a:
            diffs.append(('diff', f'{k}: on the label image ({" ".join(filter(None, b[1:]))}) but not in Shopify.'))
        else:
            sa = (added_amount(a[0]) if k == 'Added Sugars' else a[1], a[2])
            sb = (added_amount(b[0]) if k == 'Added Sugars' else b[1], b[2])
            if sa != sb:
                kind = 'format' if (k in MICRO and sb[0].endswith('%') and not sa[0]) else 'diff'
                diffs.append((kind, f'{k}: Shopify "{" ".join(filter(None, sa)) or "-"}" vs image "{" ".join(filter(None, sb)) or "-"}".'))
            if '*' in b[0] and '*' not in a[0]:
                diffs.append(('format', f'{k}: the image has a stray asterisk ("{b[0]}").'))
    if img.get('serving') and img['serving'] != c['serving']:
        diffs.append(('format', f'Serving size wording: Shopify "{c["serving"]}" vs image "{img["serving"]}" (same weight).'
                      if re.search(r'\((\d+g)\)', img['serving']).group(1) in c['serving'] else
                      f'Serving size: Shopify "{c["serving"]}" vs image "{img["serving"]}".'))
    if img.get('servings_per_container') == '1 servings per container':
        diffs.append(('format', 'Image says "1 servings per container" (grammar); new label: "1 serving per container".'))
    elif not img.get('servings_per_container'):
        diffs.append(('format', 'Image has no "servings per container" line; new label adds "1 serving per container".'))
    return diffs


def accepted(h, flags):
    """Flags the owner chose to print as-is (corrections.json 'accept') become 'accepted'."""
    acc = load('corrections.json').get(h, {}).get('accept', [])
    return [('accepted' if any(a in m for a in acc) else k, m) for k, m in flags]


def report():
    cakes, imgs = canonical(), load('from-images.json')
    rep = {h: {'title': c['title'], 'compare': compare(c, imgs.get(h)),
               'checks': accepted(h, checks(c)) + [('derived', m) for m in c['derived']]}
           for h, c in cakes.items()}
    os.makedirs(OUT, exist_ok=True)
    json.dump(rep, open(os.path.join(OUT, 'report.json'), 'w'), indent=1, ensure_ascii=False)
    for h, v in rep.items():
        print(f'\n## {v["title"]}  ({h})')
        for kind, msg in v['compare'] + v['checks']:
            print(f'  [{kind}] {msg}')
    return rep


# ---------------------------------------------------------------- type → paths
@lru_cache(None)
def face(weight):
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
    f = instantiateVariableFont(TTFont(FONT), {'wght': weight, 'wdth': 100})
    return f, f.getGlyphSet(), f.getBestCmap(), f['hmtx'], f['head'].unitsPerEm


def width(s, weight, size):
    f, gs, cmap, hmtx, upm = face(weight)
    return sum(hmtx[cmap.get(ord(ch), cmap[ord('?')])][0] for ch in s) * size / upm


def text(s, x, y, size, weight=400, anchor='start', italic=False):
    """Text as one filled path, baseline at y. anchor: start | end."""
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    f, gs, cmap, hmtx, upm = face(weight)
    k = size / upm
    if anchor == 'end':
        x -= width(s, weight, size)
    pen = SVGPathPen(gs, ntos=lambda v: f'{v:.1f}'.rstrip('0').rstrip('.'))
    for ch in s:
        gn = cmap.get(ord(ch), cmap[ord('?')])
        gs[gn].draw(TransformPen(pen, (k, 0, k * 0.2 if italic else 0, -k, x, y)))
        x += hmtx[gn][0] * k
    d = pen.getCommands()
    return (f'<path d="{d}"/>' if d else ''), x


# ---------------------------------------------------------------- label layout
W = 1000          # label width in layout units (scaled onto the canvas later)
PAD = 24          # inner padding
IW = W - 2 * PAD
BODY = 34
ROW = 54
HAIR, MED, THICK = 2.5, 13, 30


def label(c):
    """Return (svg body in label units, height)."""
    out, y = [], PAD
    rule = lambda y0, h, x0=PAD: out.append(f'<rect x="{x0}" y="{y0:.1f}" width="{W - PAD - x0}" height="{h}"/>')

    def put(s, x, base, size, weight=400, anchor='start', italic=False):
        p, end = text(s, x, base, size, weight, anchor, italic)
        out.append(p)
        return end

    # Nutrition Facts — spans the full width
    t = 'Nutrition Facts'
    size = IW / width(t, 900, 1)
    y += size * 0.80
    put(t, PAD, y, size, 900)
    y += size * 0.16
    rule(y, HAIR); y += HAIR
    y += 44; put(c['servings'], PAD, y, 38)
    y += 50; put('Serving size', PAD, y, 42, 800); put(c['serving'], W - PAD, y, 42, 800, 'end')
    y += 16; rule(y, THICK); y += THICK
    y += 36; put('Amount per serving', PAD, y, 30, 800)
    y += 72; put('Calories', PAD, y, 80, 900); put(str(c['calories']), W - PAD, y + 4, 104, 900, 'end')
    y += 18; rule(y, MED); y += MED
    y += 38; put('% Daily Value*', W - PAD, y, 30, 800, 'end')
    y += 12

    rows = c['rows']
    macros = [r for r in rows if key(r[0]) not in MICRO]
    micros = [r for r in rows if key(r[0]) in MICRO]
    for name, amount, dv in macros:
        k = key(name)
        indent = 80 if k == 'Added Sugars' else 40 if k in SUB else 0
        rule(y, HAIR, PAD + indent); y += HAIR
        base = y + ROW - 16
        x = PAD + indent
        if k == 'Added Sugars':
            x = put(f'Includes {added_amount(name)} Added Sugars', x, base, BODY)
        elif k == 'Trans Fat':
            x = put('Trans', x, base, BODY, italic=True)
            x = put(' Fat', x, base, BODY)
            if amount: put(' ' + amount, x, base, BODY)
        else:
            x = put(name, x, base, BODY, 800 if k in MAIN else 400)
            if amount: put(' ' + amount, x, base, BODY)
        if dv: put(dv, W - PAD, base, BODY, 800, 'end')
        y += ROW
    rule(y, THICK); y += THICK
    for i, (name, amount, dv) in enumerate(micros):
        if i: rule(y, HAIR); y += HAIR
        base = y + ROW - 16
        put(name + (' ' + amount if amount else ''), PAD, base, BODY)
        if dv: put(dv, W - PAD, base, BODY, 400, 'end')
        y += ROW
    rule(y, MED); y += MED

    # footnote, hanging asterisk, wrapped to the label width
    fs, lh = 25, 32
    words, lines, cur = FOOTNOTE[1:].split(), [], ''
    for w_ in words:
        trial = (cur + ' ' + w_).strip()
        if width(trial, 400, fs) > IW - 16 and cur:
            lines.append(cur); cur = w_
        else:
            cur = trial
    lines.append(cur)
    y += 14
    for i, ln in enumerate(lines):
        y += lh
        if i == 0: put('*', PAD, y, fs)
        put(ln, PAD + 14, y, fs)
    y += PAD - 4
    return '\n'.join(out), y


@lru_cache(None)
def label_scale():
    """One scale for every cake: the tallest label fills the space above the wordmark."""
    hmax = max(label(c)[1] for c in canonical().values())
    return min((CANVAS_H - 2 * 120 - 110) / hmax, (CANVAS_W - 2 * 200) / W)


def wordmark(cx, top, h):
    s = open(WORDMARK).read()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', s).group(1).split()]
    inner = re.search(r'<svg[^>]*>(.*)</svg>', s, re.S).group(1)
    k = h / vb[3]
    return (f'<g transform="translate({cx - vb[2] * k / 2:.1f} {top:.1f}) scale({k:.5f}) '
            f'translate({-vb[0]} {-vb[1]})">{inner}</g>')


def svg(c, panel='bone'):
    body, h = label(c)
    k = label_scale()
    lw, lh = W * k, h * k
    x0 = (CANVAS_W - lw) / 2
    y0 = 120   # same top line on every cake; shorter labels just end higher
    border = 4
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{CANVAS_W}" height="{CANVAS_H}" viewBox="0 0 {CANVAS_W} {CANVAS_H}" role="img" aria-label="Nutrition Facts, {html.escape(c["title"])}">
<title>Nutrition Facts — {html.escape(c["title"])}</title>
<rect width="{CANVAS_W}" height="{CANVAS_H}" fill="{PANELS[panel]}"/>
<g transform="translate({x0:.1f} {y0:.1f}) scale({k:.5f})">
<rect x="{border / 2}" y="{border / 2}" width="{W - border}" height="{h - border:.1f}" fill="#fff" stroke="{INK}" stroke-width="{border}"/>
<g fill="{INK}">
{body}
</g>
</g>
{wordmark(CANVAS_W / 2, CANVAS_H - 120 - 70, 70)}
</svg>
'''


# ---------------------------------------------------------------- text outputs
def alt_text(c):
    r = {key(x[0]): x for x in c['rows']}
    def part(k, label_=None):
        if k not in r: return None
        a = added_amount(r[k][0]) if k == 'Added Sugars' else r[k][1]
        s = f'{label_ or k.lower()} {a}'.strip()
        return s + (f' ({r[k][2]} DV)' if r[k][2] else '')
    bits = [f'Nutrition Facts for {c["title"]}: {c["servings"]}, serving size {c["serving"]}, {c["calories"]} calories']
    for k, lab in [('Total Fat', None), ('Saturated Fat', None), ('Cholesterol', None), ('Sodium', None),
                   ('Total Carbohydrate', 'total carbohydrate'), ('Dietary Fiber', None),
                   ('Total Sugars', None), ('Added Sugars', 'added sugars'), ('Protein', None)]:
        p = part(k, lab)
        if p: bits.append(p)
    return ', '.join(bits) + '.'


def metafield_text(c):
    """Paragraphs in the exact format snippets/prodani-pdp-info.liquid parses."""
    lines = [f'Servings per container: {c["servings"].split()[0]}', f'Serving size: {c["serving"]}',
             f'Calories {c["calories"]}']
    for name, amount, dv in c['rows']:
        main = f'{name} {amount}'.strip()
        lines.append(f'{main} · {dv}' if dv else main)
    lines.append(FOOTNOTE)
    return '\n'.join(lines) + '\n'


# ---------------------------------------------------------------- build
def png(svg_path, png_path):
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, 'p.html')
        open(page, 'w').write(f'<!doctype html><html><body style="margin:0"><img src="file://{svg_path}" '
                              f'width="{CANVAS_W}" height="{CANVAS_H}" style="display:block"></body></html>')
        if os.path.exists(png_path):
            os.remove(png_path)
        # Headless Chrome sometimes writes the screenshot and then never exits: wait for
        # the file, then stop it.
        proc = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                                 '--allow-file-access-from-files', f'--user-data-dir={tmp}/prof',
                                 f'--window-size={CANVAS_W},{CANVAS_H}', '--force-device-scale-factor=1',
                                 f'--screenshot={png_path}', f'file://{page}'],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(240):
            if proc.poll() is not None or (os.path.exists(png_path) and os.path.getsize(png_path) > 0):
                break
            time.sleep(0.25)
        time.sleep(0.5)
        proc.kill(); proc.wait()
        if not os.path.exists(png_path):
            raise RuntimeError('Chrome did not write ' + png_path)


def build(panels=('bone',)):
    os.makedirs(OUT, exist_ok=True)
    cakes, rep = canonical(), report()
    rows = [['handle', 'title', 'flags', 'alt_text']]
    for h, c in cakes.items():
        for p in panels:
            suffix = '' if p == panels[0] else f'-{p}'
            sp = os.path.join(OUT, f'nutrition-{h}{suffix}.svg')
            open(sp, 'w').write(svg(c, p))
            png(sp, sp[:-4] + '.png')
        open(os.path.join(OUT, f'nutrition-{h}.alt.txt'), 'w').write(alt_text(c) + '\n')
        open(os.path.join(OUT, f'nutrition-{h}.metafield.txt'), 'w').write(metafield_text(c))
        flags = rep[h]['compare'] + rep[h]['checks']
        rows.append([h, c['title'], ' | '.join(f'[{k}] {m}' for k, m in flags if k != 'format'), alt_text(c)])
    import csv
    with open(os.path.join(OUT, 'review.csv'), 'w', newline='') as f:
        csv.writer(f).writerows(rows)
    print('\nbuilt', len(cakes), 'labels ->', OUT)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'build'
    if cmd == 'extract': extract()
    elif cmd == 'check': report()
    elif cmd == 'build': build(tuple(sys.argv[2:]) or ('bone',))
    else: sys.exit(__doc__)
