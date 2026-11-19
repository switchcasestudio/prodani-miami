import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { HEAT, PAIR, PairLine, ease, lerp, stopSize, useEm } from "../heat";
import { RisePanel } from "../Rise";
import { C, LOGO, RISE, SCENES, clamp, headline, label } from "../tokens";

/* Heat and eat., version B, all vector. Timings: motion-tokens.json scenes.heatAndEatGrid.
   1. a field of i-stems (the logo's 1 : 2.8 bar) rises in, diagonal, and pulses in a heat wave
   2. a window opens in the middle of the field: a fast 5-4-3-2-1 over "5 SECONDS IN THE MICROWAVE",
      a pink timer line along its bottom edge
   3. the window widens into a band across the frame; HEAT AND EAT. rises into it as one line,
      the stop drops after EAT (the "ding"); the field keeps pulsing around it
   4. Rise into the end card with "HEAT AND EAT." */
const S = SCENES.heatAndEatGrid;
export const GRID_DING_FRAME = Math.round(S.stopDropAt + RISE.stopDur);
const STEM_RATIO = LOGO.iStem.h / LOGO.iStem.w; // 2.8

export const HeatAndEatGrid: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const { em, probe } = useEm([HEAT, PAIR]);
  const cx = W / 2;
  const cy = H / 2;
  if (!em) return <AbsoluteFill style={{ backgroundColor: C.ink }}>{probe}</AbsoluteFill>;
  const [heatEm, pairEm] = em;

  /* ---- the slogan line ---- */
  const fit = (fs: number) => pairEm * fs + stopSize(fs).gap + stopSize(fs).so;
  const fs = Math.min((0.86 * W) / fit(1), 0.26 * H);
  const lineW = fit(fs);

  /* ---- 1. the stem field ---- */
  const landscape = W > H;
  const cols = landscape ? 26 : 13;
  const p = W / cols;
  const bw = 0.42 * p;
  const bh = bw * STEM_RATIO;
  const rp = bh * 1.3;
  const rows = Math.ceil(H / rp) + 1;
  const top0 = (H - rows * rp) / 2;
  const stems = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const start = S.fieldIn[0] + ((i + (rows - 1 - j)) / (cols + rows)) * (S.fieldIn[1] - S.fieldIn[0] - RISE.inEnd);
      const inT = interpolate(f, [start, start + RISE.inEnd], [0, 1], { ...clamp, easing: RISE.easeIn });
      if (inT <= 0) continue;
      const wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * f) / S.waveFrames - (i * 0.42 + j * 0.7));
      const s = inT * (0.18 + 0.82 * wave);
      const x = (i + 0.5) * p - bw / 2;
      const yb = top0 + (j + 1) * rp;
      stems.push(<rect key={`${i}-${j}`} x={x} y={yb - bh * s} width={bw} height={bh * s} fill={C.white} />);
    }
  }

  /* ---- 2. the window, then the band ---- */
  const winW = landscape ? 0.46 * W : 0.9 * W;
  const winH = winW / 2.6; // the real tray's proportion
  const bandH = 0.8 * fs * 2;
  const open = ease(f, S.window);
  const toBand = ease(f, S.band);
  const w = lerp(winW * open, W + 2, toBand);
  const h = lerp(winH * open, bandH, toBand);
  const win = { x: cx - w / 2, y: cy - h / 2, w, h };

  // the countdown: 5 4 3 2 1, each digit rising in quickly
  const per = (S.count[1] - S.count[0]) / 5;
  const ci = Math.floor((f - S.count[0]) / per);
  const counting = f >= S.count[0] && f < S.count[1];
  const digitIn = counting ? interpolate(f - (S.count[0] + ci * per), [0, 4], [100, 0], { ...clamp, easing: RISE.easeIn }) : 0;
  const timer = interpolate(f, S.count, [0, 1], clamp);
  const labelSize = (landscape ? 0.07 : 0.085) * winH;
  const labelIn = interpolate(f, [S.window[1] - 4, S.window[1] - 4 + RISE.inEnd], [100, 0], { ...clamp, easing: RISE.easeIn });
  const lineIn = interpolate(f, S.lineIn, [110, 0], { ...clamp, easing: RISE.easeIn });

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      {probe}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {stems}
        {open > 0 ? <rect x={win.x} y={win.y} width={win.w} height={win.h} fill={C.ink} /> : null}
        {counting || (f >= S.count[1] && f < S.band[0]) ? (
          <rect x={cx - winW / 2} y={cy + winH / 2 - 0.035 * winH} width={winW * timer} height={0.035 * winH} fill={C.pink} />
        ) : null}
      </svg>
      {/* inside the window */}
      {open > 0 && f < S.band[0] ? (
        <div style={{ position: "absolute", left: win.x, top: win.y, width: win.w, height: win.h, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0.08 * winH, height: labelSize * 1.5, overflow: "hidden", textAlign: "center" }}>
            <div style={{ ...label, color: C.white, fontSize: labelSize, lineHeight: 1.5, translate: `0px ${labelIn}%` }}>{S.microLabel}</div>
          </div>
          {counting ? (
            <div style={{ position: "absolute", left: 0, right: 0, top: 0.26 * winH, height: 0.62 * winH, overflow: "hidden", textAlign: "center" }}>
              <div style={{ ...headline, color: C.white, fontSize: 0.78 * winH, lineHeight: 0.8, translate: `0px ${digitIn}%` }}>{5 - ci}</div>
            </div>
          ) : null}
        </div>
      ) : null}
      {/* 3. HEAT AND EAT. rises into the band as one line */}
      {f >= S.lineIn[0] ? (
        <div style={{ position: "absolute", left: 0, top: cy - bandH / 2, width: W, height: bandH, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, translate: `0px ${lineIn}%` }}>
            <PairLine f={f} fs={fs} left={cx - lineW / 2} top={bandH / 2 - (0.8 * fs) / 2} join={1} stopAt={S.stopDropAt} heatEm={heatEm} />
          </div>
        </div>
      ) : null}
      <Sequence name="SFX: ding" from={GRID_DING_FRAME} durationInFrames={1} layout="none"><></></Sequence>
      <Sequence name="4. Rise into LogoSting" from={S.riseAt}>
        <RisePanel mode="stay" line={S.line} />
      </Sequence>
    </AbsoluteFill>
  );
};
