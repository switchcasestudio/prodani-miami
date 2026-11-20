# Outlines a line of text from the theme font for the page loader (motion-tokens.json loader.line).
# Needs fonttools + brotli (pip). Usage: python3 scripts/heat-line.py public/archivo-var-latin.woff2 "HEAT AND EAT"
# Prints JSON with the path in whole font units, baseline at 0, y down; 'glyphs' has one path per letter.
import sys, json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
src, text = sys.argv[1], sys.argv[2]
f = TTFont(src)
inst = instantiateVariableFont(f, {"wght": 900, "wdth": 70}, inplace=False)
gs = inst.getGlyphSet(); cmap = inst.getBestCmap(); upm = inst['head'].unitsPerEm
hmtx = inst['hmtx']
# pair kerning from GPOS (format 1 pairs + class pairs) via a simple lookup
kern = {}
try:
    gpos = inst['GPOS'].table
    for lk in gpos.LookupList.Lookup:
        if lk.LookupType != 2: continue
        for st in lk.SubTable:
            if st.Format == 1:
                cov = st.Coverage.glyphs
                for i, ps in enumerate(st.PairSet):
                    for pv in ps.PairValueRecord:
                        v = pv.Value1.XAdvance if pv.Value1 and hasattr(pv.Value1, 'XAdvance') else 0
                        if v: kern.setdefault((cov[i], pv.SecondGlyph), v)
            elif st.Format == 2:
                cov = set(st.Coverage.glyphs)
                c1 = st.ClassDef1.classDefs; c2 = st.ClassDef2.classDefs
                kern.setdefault('__cls', []).append((cov, c1, c2, st.Class1Record))
except Exception as e:
    print('kern err', e, file=sys.stderr)
def kv(a, b):
    if (a, b) in kern: return kern[(a, b)]
    for cov, c1, c2, rec in kern.get('__cls', []):
        if a in cov:
            r = rec[c1.get(a, 0)].Class2Record[c2.get(b, 0)]
            v = getattr(r.Value1, 'XAdvance', 0) if r.Value1 else 0
            if v: return v
    return 0
x = 0; parts = []; names = [cmap[ord(ch)] for ch in text]
for i, g in enumerate(names):
    pen = SVGPathPen(gs)
    gs[g].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))   # y down, baseline at 0
    parts.append(pen.getCommands())
    x += hmtx[g][0]
    if i + 1 < len(names): x += kv(g, names[i + 1])
bp = BoundsPen(gs)
for i, g in enumerate(names): pass
import re
d = ' '.join(p for p in parts if p)
d = re.sub(r'-?\d+\.\d+', lambda m: str(round(float(m.group()))), d)  # whole font units
# bounds of the whole line
from fontTools.pens.recordingPen import RecordingPen
glyphs = [re.sub(r'-?\d+\.\d+', lambda m: str(round(float(m.group()))), p) for p in parts if p]   # one path per letter (no spaces)
print(json.dumps({"upm": upm, "advance": x, "capHeight": getattr(inst['OS/2'], 'sCapHeight', None), "d": d, "glyphs": glyphs, "len": len(d)}))
