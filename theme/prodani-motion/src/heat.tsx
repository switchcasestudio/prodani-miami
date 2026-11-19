// Shared pieces of the vector Heat and eat videos: text measuring and the one-line slogan.
import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, interpolate } from "remotion";
import { C, LOGO, RISE, clamp, headline, label } from "./tokens";

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (f: number, r: readonly number[] | number[], e = RISE.easeIn) =>
  interpolate(f, [r[0], r[1]], [0, 1], { ...clamp, easing: e });

/** Widths in em of headline-style texts, measured once in the browser after the font loads. */
export const useEm = (texts: string[]) => {
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
    <div style={{ position: "absolute", visibility: "hidden", whiteSpace: "pre" }}>
      {texts.map((t, i) => (
        <span key={t} ref={(el) => { refs.current[i] = el; }} style={{ ...headline, fontSize: 100, display: "inline-block", whiteSpace: "pre" }}>
          {t}
        </span>
      ))}
    </div>
  );
  return { em, probe };
};

export const HEAT = "HEAT";
export const PAIR = "HEAT AND EAT";
export const stopSize = (fs: number) => ({ so: 0.18 * fs, gap: 0.06 * fs });

/** Stop drop in px for a stop of size `so`, same move and distance (in logo units) as the Rise. */
export const dropY = (f: number, at: number, so: number) =>
  interpolate(f, [at, at + RISE.stopDur], [RISE.stopFromY * (so / LOGO.stop.w), 0], { ...clamp, easing: RISE.easeDrop });

type LineProps = {
  readonly f: number;
  readonly fs: number; // final font size: the whole line fits
  readonly left: number; // element left (line + stop centred on the frame)
  readonly top: number;
  /** 0..1: how far "AND EAT" has risen in. */
  readonly join: number;
  readonly stopAt: number;
  /** Before the join: HEAT alone, scaled by this and centred at heatCx. */
  readonly heatScale?: number;
  readonly heatShiftX?: number;
  readonly clip?: string;
};

/** "HEAT AND EAT." on one line. HEAT can stand alone first (scaled, centred); AND EAT rises in beside it. */
export const PairLine: React.FC<LineProps & { heatEm: number }> = ({ f, fs, left, top, join, stopAt, heatScale = 1, heatShiftX = 0, clip, heatEm }) => {
  const { so, gap } = stopSize(fs);
  return (
    <div
      style={{
        position: "absolute", left, top, display: "flex", alignItems: "baseline", whiteSpace: "pre",
        ...headline, fontSize: fs, lineHeight: 0.8, color: C.white, clipPath: clip,
        transformOrigin: `${(heatEm * fs) / 2}px 50%`, translate: `${heatShiftX}px 0px`, scale: `${heatScale}`,
      }}
    >
      <span>{HEAT}</span>
      <span style={{ display: "inline-block", overflow: "hidden", lineHeight: 0.8, paddingTop: "0.1em", marginTop: "-0.1em" }}>
        <span style={{ display: "inline-block", translate: `0px ${(1 - join) * 110}%` }}>{" AND EAT"}</span>
      </span>
      <span style={{ display: "inline-block", width: so, height: so, marginLeft: gap, backgroundColor: C.pink, opacity: f >= stopAt ? 1 : 0, translate: `0px ${dropY(f, stopAt, so)}px` }} />
    </div>
  );
};

/** A tracked caps line that rises into its own clip. */
export const RiseLabel: React.FC<{ text: string; size: number; top: number; f: number; at: number }> = ({ text, size, top, f, at }) => {
  const y = interpolate(f, [at, at + RISE.inEnd], [100, 0], { ...clamp, easing: RISE.easeIn });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, height: size * 1.5, overflow: "hidden", textAlign: "center" }}>
      <div style={{ ...label, color: C.white, fontSize: size, lineHeight: 1.5, translate: `0px ${y}%` }}>{text}</div>
    </div>
  );
};

/** Rows of HEAT AND EAT (each with its pink stop) drifting in alternating directions. Rows inside `skip` px of the centre are left out. */
export const Bands: React.FC<{ f: number; at: number; W: number; H: number; m: number; skip: number }> = ({ f, at, W, H, m, skip }) => {
  if (f < at) return null;
  const rh = 0.105 * m;
  const n = Math.ceil(H / 2 / rh) + 1;
  const rows = [];
  for (let k = -n; k <= n; k++) {
    if (Math.abs(k * rh) < skip + 0.45 * rh) continue;
    const dir = k % 2 === 0 ? 1 : -1;
    const rise = interpolate(f, [at + Math.abs(k) * 1.5, at + Math.abs(k) * 1.5 + RISE.inEnd], [100, 0], { ...clamp, easing: RISE.easeIn });
    const x = -W - (dir > 0 ? 0.3 * W : 0) + dir * 0.006 * W * (f - at);
    rows.push(
      <div key={k} style={{ position: "absolute", left: 0, right: 0, top: H / 2 + k * rh - rh / 2, height: rh, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: x, top: 0, height: rh, display: "flex", alignItems: "center", whiteSpace: "nowrap", translate: `0px ${rise}%`, ...label, fontSize: 0.42 * rh, color: C.white }}>
          {Array.from({ length: 24 }, (_, r) => (
            <span key={r} style={{ display: "inline-flex", alignItems: "baseline", marginRight: "1.2em" }}>
              {PAIR}
              <span style={{ display: "inline-block", width: "0.2em", height: "0.2em", marginLeft: "0.06em", backgroundColor: C.pink }} />
            </span>
          ))}
        </div>
      </div>,
    );
  }
  return <>{rows}</>;
};
