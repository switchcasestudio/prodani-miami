import React from "react";
import { C, LOGO } from "./tokens";

const [VX, VY, VW, VH] = LOGO.viewBox;

/** Where the logo sits in a W x H frame: 46% of the short side, centred on its viewBox. */
export const logoBox = (W: number, H: number) => {
  const w = 0.46 * Math.min(W, H);
  const s = w / VW;
  const h = VH * s;
  return { w, h, s, left: (W - w) / 2, top: (H - h) / 2 };
};
export type LogoBox = ReturnType<typeof logoBox>;

/** Logo units -> px inside a frame laid out with logoBox. */
export const toPx = (b: LogoBox, x: number, y: number) => ({
  x: b.left + (x - VX) * b.s,
  y: b.top + (y - VY) * b.s,
});

export type LogoProps = {
  readonly width: number;
  readonly letters?: string;
  readonly stopColor?: string;
  /** Hide the letters (everything except the i and the stop). */
  readonly wordOpacity?: number;
  /** Stop: vertical offset in logo units (negative = above), and visibility. */
  readonly stopY?: number;
  readonly stopVisible?: boolean;
  /** i stem: hidden when it has left the word; base opacity and bottom-up fill (slow mode). */
  readonly stemVisible?: boolean;
  readonly stemBaseOpacity?: number;
  readonly stemFill?: number;
  /** i dot: vertical offset in logo units, and visibility. */
  readonly dotY?: number;
  readonly dotVisible?: boolean;
  readonly style?: React.CSSProperties;
};

export const Logo: React.FC<LogoProps> = ({
  width,
  letters = C.white,
  stopColor = C.pink,
  wordOpacity = 1,
  stopY = 0,
  stopVisible = true,
  stemVisible = true,
  stemBaseOpacity = 1,
  stemFill = 1,
  dotY = 0,
  dotVisible = true,
  style,
}) => {
  const { stop, iStem, iDot, wordPath } = LOGO;
  return (
    <svg
      viewBox={`${VX} ${VY} ${VW} ${VH}`}
      width={width}
      height={(width * VH) / VW}
      style={{ display: "block", overflow: "visible", ...style }}
      aria-label="ProDani"
    >
      <path d={wordPath} fill={letters} opacity={wordOpacity} />
      {stemVisible ? (
        <g>
          <rect x={iStem.x} y={iStem.y} width={iStem.w} height={iStem.h} fill={letters} opacity={stemBaseOpacity} />
          {stemBaseOpacity < 1 && stemFill > 0 ? (
            <rect
              x={iStem.x}
              y={iStem.y + iStem.h * (1 - stemFill)}
              width={iStem.w}
              height={iStem.h * stemFill}
              fill={letters}
            />
          ) : null}
        </g>
      ) : null}
      {dotVisible ? (
        <rect x={iDot.x} y={iDot.y + dotY} width={iDot.w} height={iDot.h} fill={letters} />
      ) : null}
      {stopVisible ? (
        <rect x={stop.x} y={stop.y + stopY} width={stop.w} height={stop.h} fill={stopColor} />
      ) : null}
    </svg>
  );
};
