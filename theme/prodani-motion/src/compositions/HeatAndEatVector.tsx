import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Logo, logoBox, toPx } from "../Logo";
import { RisePanel } from "../Rise";
import { C, LOGO, RISE, SCENES, clamp, headline, label } from "../tokens";

/* Heat and eat., all vector: no photos. Every shape is flat, square-cornered, ink/white with
   pink only for the stops and the timer. Timings: motion-tokens.json scenes.heatAndEatVector.
   1. the i's stem lifts out of "prodani.", tips 90 degrees and grows into the cake (a white bar)
   2. heat: square outlines ripple out of the cake, steam dashes rise in a travelling wave
   3. the cake slides down into the timer track, HEAT builds up in stripes, the pink timer fills,
      the stop drops after the T (the "ding")
   4. the H tips out, EAT. re-centres; rows of HEAT AND EAT rise in and drift
   5. Rise into the end card with "HEAT AND EAT." */
const S = SCENES.heatAndEatVector;
export const VECTOR_DING_FRAME = Math.round(S.stopDropAt + RISE.stopDur);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (f: number, r: readonly number[] | number[], e = RISE.easeIn) => interpolate(f, [r[0], r[1]], [0, 1], { ...clamp, easing: e });

/** Width of a text in em for the headline style, measured once in the browser after fonts load. */
const useEm = (texts: string[]) => {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const [em, setEm] = useState<number[] | null>(null);
  const [handle] = useState(() => delayRender("measure headline"));
  useLayoutEffect(() => {
    document.fonts.ready.then(() => {
      setEm(refs.current.map((r) => (r ? r.offsetWidth / 100 : 1)));
      continueRender(handle);
    });
  }, [handle]);
  const probe = (
    <div style={{ position: "absolute", visibility: "hidden", whiteSpace: "nowrap" }}>
      {texts.map((t, i) => (
        <span key={t} ref={(el) => { refs.current[i] = el; }} style={{ ...headline, fontSize: 100, display: "inline-block" }}>
          {t}
        </span>
      ))}
    </div>
  );
  return { em, probe };
};

/** The word HEAT (H, EAT, the stop), laid out so HEAT is centred on the frame until it re-centres as EAT. */
const Word: React.FC<{ fs: number; top: number; f: number; clip?: string }> = ({ fs, top, f, clip }) => {
  const { height: H } = useVideoConfig();
  const so = 0.18 * fs;
  const gap = 0.06 * fs;
  const unit = so / LOGO.stop.w;
  const stopY = interpolate(f, [S.stopDropAt, S.stopDropAt + RISE.stopDur], [RISE.stopFromY * unit, 0], { ...clamp, easing: RISE.easeDrop });
  const fallLen = S.hFall[1] - S.hFall[0];
  const hRot = interpolate(f, [S.hFall[0], S.hFall[0] + fallLen * 0.6], [0, -90], { ...clamp, easing: RISE.easeDrop });
  const hDrop = interpolate(f, [S.hFall[0] + fallLen * 0.3, S.hFall[1]], [0, H], { ...clamp, easing: RISE.easeDrop });
  const recenter = ease(f, S.recenter);
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", alignItems: "baseline",
        ...headline, fontSize: fs, lineHeight: 0.8, color: C.white, clipPath: clip,
        // HEAT is centred while the (still invisible) stop takes no visual room; then EAT. as a whole.
        translate: `${(1 - recenter) * (gap + so) / 2}px 0px`,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: `${1 - recenter}fr` }}>
        <span style={{ minWidth: 0, display: "block", transformOrigin: "0% 100%", rotate: `${hRot}deg`, translate: `0px ${hDrop}px` }}>H</span>
      </div>
      <span>EAT</span>
      <span style={{ display: "inline-block", width: so, height: so, marginLeft: gap, backgroundColor: C.pink, opacity: f >= S.stopDropAt ? 1 : 0, translate: `0px ${stopY}px` }} />
    </div>
  );
};

export const HeatAndEatVector: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const { em, probe } = useEm(["HEAT"]);
  const m = Math.min(W, H);
  const cx = W / 2;
  const cy = H / 2;
  if (!em) return <AbsoluteFill style={{ backgroundColor: C.ink }}>{probe}</AbsoluteFill>;

  /* ---- geometry ---- */
  const fs = Math.min((0.78 * m) / em[0], 0.36 * H);
  const wordW = em[0] * fs;
  const wordH = 0.8 * fs;
  const wordTop = cy - wordH / 2;
  const track = { x: cx - wordW / 2, y: wordTop + wordH + 0.13 * fs, w: wordW, h: 0.07 * fs };
  const cakeL = wordW;
  const cake = { x: cx - cakeL / 2, y: cy - cakeL / 2.8 / 2, w: cakeL, h: cakeL / 2.8 };
  const stroke = Math.max(2, 0.004 * m);

  /* ---- 1. the stem leaves the word and becomes the cake ---- */
  const b = logoBox(W, H);
  const st = LOGO.iStem;
  const p0 = toPx(b, st.x + st.w / 2, st.y + st.h / 2); // stem centre in the logo
  const lift = ease(f, S.lift) * 0.22 * m;
  const tip = ease(f, S.tip) * 90;
  const move = ease(f, S.center);
  const k = lerp(1, cakeL / (st.h * b.s), ease(f, S.grow));
  const stemCx = lerp(p0.x, cx, move);
  const stemCy = lerp(p0.y - lift, cy, move);
  const wordOut = interpolate(f, S.wordOut, [0, H], { ...clamp, easing: RISE.easeOut });

  /* the cake (from S.grow end) morphs into the timer track */
  const mo = ease(f, S.morph);
  const slab = {
    x: lerp(cake.x, track.x, mo), y: lerp(cake.y, track.y, mo),
    w: lerp(cake.w, track.w, mo), h: lerp(cake.h, track.h, mo),
  };
  const slabOpacity = lerp(1, 0.16, mo);
  const fill = interpolate(f, S.barFill, [0, 1], clamp); // a timer: linear
  const trackGone = 1 - ease(f, S.trackGone);

  /* ---- 2. heat rings and steam ---- */
  const rings = Array.from({ length: S.rings.count }, (_, j) => {
    const a = (f - (S.rings.from + j * S.rings.every)) / S.rings.life;
    if (a < 0 || a > 1) return null;
    const sc = lerp(1, S.rings.growTo, a);
    return (
      <rect key={j} x={cx - (cake.w * sc) / 2} y={cy - (cake.h * sc) / 2} width={cake.w * sc} height={cake.h * sc}
        fill="none" stroke={C.white} strokeWidth={stroke} opacity={0.5 * (1 - a)} />
    );
  });

  const [s0, s1] = S.steam.range;
  const steamOn = interpolate(f, [s0, s0 + 12], [0, 1], { ...clamp, easing: RISE.easeIn }) * interpolate(f, [s1 - 12, s1], [1, 0], { ...clamp, easing: RISE.easeOut });
  const steamBottom = lerp(cake.y, wordTop, mo) - 0.08 * fs;
  const dashW = 0.05 * fs;
  const dashL = 0.13 * fs;
  const period = 0.2 * fs;
  const scroll = ((f - s0) / S.steam.scrollFrames) * period;
  const maxH = Math.min(0.95 * fs, wordTop - 0.08 * m);
  const cols = S.steam.columns;
  const steam = steamOn <= 0 ? null : Array.from({ length: cols }, (_, i) => {
    const x = cx - wordW / 2 + ((i + 0.5) * wordW) / cols - dashW / 2;
    const wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * (f - s0)) / S.steam.periodFrames - i * 0.9);
    const h = maxH * (0.3 + 0.7 * wave) * steamOn;
    const dashes = [];
    for (let n = -1; n < Math.ceil(maxH / period) + 2; n++) {
      const yb = steamBottom - (n * period + (scroll % period));
      dashes.push(<rect key={n} x={x} y={yb - dashL} width={dashW} height={dashL} fill={C.white} />);
    }
    return (
      <g key={i}>
        <clipPath id={`hev-col-${i}`}>
          <rect x={x - 1} y={steamBottom - h} width={dashW + 2} height={h} />
        </clipPath>
        <g clipPath={`url(#hev-col-${i})`}>{dashes}</g>
      </g>
    );
  });

  /* ---- 3. HEAT builds up in vertical stripes, bottom first ---- */
  const revealing = f >= S.reveal[0] && f < S.reveal[1];
  const stripes = S.stripes;
  const stripeWord = Array.from({ length: stripes }, (_, i) => {
    const d = (S.reveal[1] - S.reveal[0] - 10) * (i / (stripes - 1));
    const t = interpolate(f, [S.reveal[0] + d, S.reveal[0] + d + 10], [0, 1], { ...clamp, easing: RISE.easeIn });
    // stripe i of HEAT, shown from the bottom up. The Word box is the full frame width and HEAT
    // sits centred in it with the (invisible) stop after it, before the box's own translate.
    const so = 0.18 * fs, gap = 0.06 * fs;
    const x0 = (W - (wordW + gap + so)) / 2;
    const l = x0 + (i * wordW) / stripes - (i === 0 ? 0.05 * fs : 0);
    const r = W - (x0 + ((i + 1) * wordW) / stripes) - (i === stripes - 1 ? 0.05 * fs : 0);
    return <Word key={i} fs={fs} top={wordTop} f={f} clip={`inset(${(1 - t) * 100}% ${r}px 0px ${l}px)`} />;
  });

  /* ---- 4. bands of HEAT AND EAT ---- */
  const rh = 0.105 * m;
  const bandFont = 0.42 * rh;
  const bandRows: React.ReactNode[] = [];
  if (f >= S.bandsAt) {
    const n = Math.ceil(H / 2 / rh) + 1;
    for (let kk = -n; kk <= n; kk++) {
      const yc = cy + kk * rh;
      if (Math.abs(kk * rh) < wordH / 2 + 0.45 * rh) continue;
      const dir = kk % 2 === 0 ? 1 : -1;
      const rise = interpolate(f, [S.bandsAt + Math.abs(kk) * 2, S.bandsAt + Math.abs(kk) * 2 + RISE.inEnd], [100, 0], { ...clamp, easing: RISE.easeIn });
      const x = -W + dir * 0.004 * W * (f - S.bandsAt) - (dir < 0 ? 0 : 0.3 * W);
      bandRows.push(
        <div key={kk} style={{ position: "absolute", left: 0, right: 0, top: yc - rh / 2, height: rh, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: x, top: 0, height: rh, display: "flex", alignItems: "center", whiteSpace: "nowrap", translate: `0px ${rise}%`, ...label, fontSize: bandFont, color: C.white }}>
            {Array.from({ length: 24 }, (_, r) => (
              <span key={r} style={{ display: "inline-flex", alignItems: "baseline", marginRight: "1.2em" }}>
                HEAT AND EAT
                <span style={{ display: "inline-block", width: "0.2em", height: "0.2em", marginLeft: "0.06em", backgroundColor: C.pink }} />
              </span>
            ))}
          </div>
        </div>,
      );
    }
  }

  /* placeholder: where heating details would go (no times, no instructions on screen) */
  const phIn = interpolate(f, [S.barFill[0], S.barFill[0] + RISE.inEnd], [100, 0], { ...clamp, easing: RISE.easeIn });
  const showPh = f >= S.barFill[0] && f < S.trackGone[0];

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      {probe}
      {/* 1. the word, minus its stem, falls away */}
      {f < S.wordOut[1] ? (
        <div style={{ position: "absolute", left: b.left, top: b.top, translate: `0px ${wordOut}px` }}>
          <Logo width={b.w} stemVisible={f < S.lift[0]} />
        </div>
      ) : null}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {rings}
        {f >= S.lift[0] && f < S.grow[1] ? (
          <rect x={-(st.w * b.s) / 2} y={-(st.h * b.s) / 2} width={st.w * b.s} height={st.h * b.s} fill={C.white}
            transform={`translate(${stemCx} ${stemCy}) rotate(${tip}) scale(${k})`} />
        ) : null}
        {f >= S.grow[1] && trackGone > 0 ? (
          <g transform={`translate(${slab.x + slab.w} 0) scale(${trackGone} 1) translate(${-(slab.x + slab.w)} 0)`}>
            <rect x={slab.x} y={slab.y} width={slab.w} height={slab.h} fill={C.white} opacity={slabOpacity} />
            {fill > 0 ? <rect x={track.x} y={track.y} width={track.w * fill} height={track.h} fill={C.pink} /> : null}
          </g>
        ) : null}
      </svg>
      {/* 3. HEAT, then EAT. */}
      {revealing ? stripeWord : f >= S.reveal[1] ? <Word fs={fs} top={wordTop} f={f} /> : null}
      {showPh ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: track.y + track.h + 0.05 * m, height: 0.045 * m, overflow: "hidden", textAlign: "center" }}>
          <div style={{ ...label, color: C.white, fontSize: 0.03 * m, lineHeight: 1.5, translate: `0px ${phIn}%` }}>{S.placeholder}</div>
        </div>
      ) : null}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>{steam}</svg>
      {bandRows}
      <Sequence name="SFX: ding" from={VECTOR_DING_FRAME} durationInFrames={1} layout="none">
        <></>
      </Sequence>
      <Sequence name="5. Rise into LogoSting" from={S.riseAt}>
        <RisePanel mode="stay" line={S.line} />
      </Sequence>
    </AbsoluteFill>
  );
};
