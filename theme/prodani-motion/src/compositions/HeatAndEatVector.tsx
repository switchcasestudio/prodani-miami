import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Bands, HEAT, PAIR, PairLine, RiseLabel, ease, lerp, stopSize, useEm } from "../heat";
import { Logo, logoBox, toPx } from "../Logo";
import { RisePanel } from "../Rise";
import { C, LOGO, RISE, SCENES, clamp } from "../tokens";

/* Heat and eat., version A, all vector: no photos. Timings: motion-tokens.json scenes.heatAndEatVector.
   1. the i's stem lifts out of "prodani.", tips 90 degrees and grows into the cake (a white bar)
   2. heat: square outlines ripple out of the cake, steam dashes rise in a travelling wave
   3. the cake slides down into the timer track, HEAT builds up in stripes, the pink timer fills
      over "5 SECONDS IN THE MICROWAVE"
   4. AND EAT rises in beside HEAT (the pair is never split), the stop drops after EAT (the "ding");
      rows of HEAT AND EAT rise in and drift
   5. Rise into the end card with "HEAT AND EAT." */
const S = SCENES.heatAndEatVector;
export const VECTOR_DING_FRAME = Math.round(S.stopDropAt + RISE.stopDur);

export const HeatAndEatVector: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const { em, probe } = useEm([HEAT, PAIR]);
  const m = Math.min(W, H);
  const cx = W / 2;
  const cy = H / 2;
  if (!em) return <AbsoluteFill style={{ backgroundColor: C.ink }}>{probe}</AbsoluteFill>;
  const [heatEm, pairEm] = em;

  /* ---- geometry ---- */
  // fs1: HEAT alone, big. fs2: the whole line HEAT AND EAT. fits the frame.
  const fs1 = Math.min((0.78 * m) / heatEm, 0.36 * H);
  const wordW = heatEm * fs1;
  const wordTop = cy - (0.8 * fs1) / 2;
  const fit = (fs: number) => pairEm * fs + stopSize(fs).gap + stopSize(fs).so;
  const fs2 = Math.min((0.88 * W) / fit(1), 0.3 * H);
  const lineW = fit(fs2);
  const lineLeft = cx - lineW / 2;
  const lineTop = cy - (0.8 * fs2) / 2;
  const join = ease(f, S.join);
  const heatScale = lerp(fs1 / fs2, 1, join);
  const heatShiftX = (1 - join) * (cx - (lineLeft + (heatEm * fs2) / 2));

  const track = { x: cx - wordW / 2, y: wordTop + 0.8 * fs1 + 0.13 * fs1, w: wordW, h: 0.07 * fs1 };
  const cakeL = wordW;
  const cake = { x: cx - cakeL / 2, y: cy - cakeL / 2.8 / 2, w: cakeL, h: cakeL / 2.8 };
  const stroke = Math.max(2, 0.004 * m);

  /* ---- 1. the stem leaves the word and becomes the cake ---- */
  const b = logoBox(W, H);
  const st = LOGO.iStem;
  const p0 = toPx(b, st.x + st.w / 2, st.y + st.h / 2);
  const lift = ease(f, S.lift) * 0.22 * m;
  const tip = ease(f, S.tip) * 90;
  const move = ease(f, S.center);
  const k = lerp(1, cakeL / (st.h * b.s), ease(f, S.grow));
  const stemCx = lerp(p0.x, cx, move);
  const stemCy = lerp(p0.y - lift, cy, move);
  const wordOut = interpolate(f, S.wordOut, [0, H], { ...clamp, easing: RISE.easeOut });

  const mo = ease(f, S.morph);
  const slab = { x: lerp(cake.x, track.x, mo), y: lerp(cake.y, track.y, mo), w: lerp(cake.w, track.w, mo), h: lerp(cake.h, track.h, mo) };
  const fill = interpolate(f, S.barFill, [0, 1], clamp);
  const trackGone = 1 - ease(f, S.trackGone);

  /* ---- 2. heat rings and steam ---- */
  const rings = Array.from({ length: S.rings.count }, (_, j) => {
    const a = (f - (S.rings.from + j * S.rings.every)) / S.rings.life;
    if (a < 0 || a > 1) return null;
    const sc = lerp(1, S.rings.growTo, a);
    return <rect key={j} x={cx - (cake.w * sc) / 2} y={cy - (cake.h * sc) / 2} width={cake.w * sc} height={cake.h * sc} fill="none" stroke={C.white} strokeWidth={stroke} opacity={0.5 * (1 - a)} />;
  });

  const [s0, s1] = S.steam.range;
  const steamOn = interpolate(f, [s0, s0 + 8], [0, 1], { ...clamp, easing: RISE.easeIn }) * interpolate(f, [s1 - 8, s1], [1, 0], { ...clamp, easing: RISE.easeOut });
  const steamBottom = lerp(cake.y, wordTop, mo) - 0.08 * fs1;
  const dashW = 0.05 * fs1;
  const dashL = 0.13 * fs1;
  const period = 0.2 * fs1;
  const scroll = ((f - s0) / S.steam.scrollFrames) * period;
  const maxH = Math.min(0.95 * fs1, wordTop - 0.08 * m);
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
        <clipPath id={`hev-col-${i}`}><rect x={x - 1} y={steamBottom - h} width={dashW + 2} height={h} /></clipPath>
        <g clipPath={`url(#hev-col-${i})`}>{dashes}</g>
      </g>
    );
  });

  /* ---- 3. HEAT builds up in vertical stripes, bottom first ---- */
  const line = (clip?: string, key?: number) => (
    <PairLine key={key} f={f} fs={fs2} left={lineLeft} top={lineTop} join={join} stopAt={S.stopDropAt} heatScale={heatScale} heatShiftX={heatShiftX} clip={clip} heatEm={heatEm} />
  );
  const revealing = f >= S.reveal[0] && f < S.reveal[1];
  const stripes = Array.from({ length: S.stripes }, (_, i) => {
    const d = (S.reveal[1] - S.reveal[0] - 8) * (i / (S.stripes - 1));
    const t = interpolate(f, [S.reveal[0] + d, S.reveal[0] + d + 8], [0, 1], { ...clamp, easing: RISE.easeIn });
    // stripe i of HEAT, in the line element's own (unscaled) px
    const hw = heatEm * fs2;
    const l = (i * hw) / S.stripes - (i === 0 ? 0.1 * fs2 : 0);
    const r = lineW - ((i + 1) * hw) / S.stripes - (i === S.stripes - 1 ? 0.03 * fs2 : 0);
    return line(`inset(${(1 - t) * 100}% ${r - 1}px 0px ${l - 1}px)`, i); // 1px overlap: no seams
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      {probe}
      {f < S.wordOut[1] ? (
        <div style={{ position: "absolute", left: b.left, top: b.top, translate: `0px ${wordOut}px` }}>
          <Logo width={b.w} stemVisible={f < S.lift[0]} />
        </div>
      ) : null}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {rings}
        {f >= S.lift[0] && f < S.grow[1] ? (
          <rect x={-(st.w * b.s) / 2} y={-(st.h * b.s) / 2} width={st.w * b.s} height={st.h * b.s} fill={C.white} transform={`translate(${stemCx} ${stemCy}) rotate(${tip}) scale(${k})`} />
        ) : null}
        {f >= S.grow[1] && trackGone > 0 ? (
          <g transform={`translate(${slab.x + slab.w} 0) scale(${trackGone} 1) translate(${-(slab.x + slab.w)} 0)`}>
            <rect x={slab.x} y={slab.y} width={slab.w} height={slab.h} fill={C.white} opacity={lerp(1, 0.16, mo)} />
            {fill > 0 ? <rect x={track.x} y={track.y} width={track.w * fill} height={track.h} fill={C.pink} /> : null}
          </g>
        ) : null}
      </svg>
      {revealing ? stripes : f >= S.reveal[1] ? line() : null}
      {f >= S.barFill[0] && f < S.trackGone[0] ? (
        <RiseLabel text={S.microLabel} size={0.034 * m} top={track.y + track.h + 0.045 * m} f={f} at={S.barFill[0]} />
      ) : null}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>{steam}</svg>
      <Bands f={f} at={S.bandsAt} W={W} H={H} m={m} skip={0.4 * fs2} />
      <Sequence name="SFX: ding" from={VECTOR_DING_FRAME} durationInFrames={1} layout="none"><></></Sequence>
      <Sequence name="5. Rise into LogoSting" from={S.riseAt}>
        <RisePanel mode="stay" line={S.line} />
      </Sequence>
    </AbsoluteFill>
  );
};
