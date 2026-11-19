import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Logo, logoBox } from "./Logo";
import { C, RISE, SCENES, T, clamp, label, tokens } from "./tokens";

/** Stop drop of the Rise hold, as Logo props, for local frame f (0 = start of the Rise). */
export const stopDrop = (f: number, start = RISE.stopStart) => ({
  stopVisible: f >= start,
  stopY: interpolate(f, [start, start + RISE.stopDur], [RISE.stopFromY, 0], { ...clamp, easing: RISE.easeDrop }),
});

type RisePanelProps = {
  /** "through": In, hold, Out (the page transition). "stay": In and hold, then the panel stays (LogoSting). */
  readonly mode: "through" | "stay";
  /** Optional tracked caps line under the logo (LogoSting only). */
  readonly line?: string;
};

/**
 * The Rise move, exactly as in motion-tokens.json: an ink panel rises from below to cover the
 * frame carrying the white word without its stop (In), the pink stop drops onto its place during
 * the hold, and the panel leaves through the top (Out). Local frame 0 = start of In.
 */
export const RisePanel: React.FC<RisePanelProps> = ({ mode, line }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const b = logoBox(W, H);

  const y =
    f < RISE.holdEnd || mode === "stay"
      ? interpolate(f, [0, RISE.inEnd], [H, 0], { ...clamp, easing: RISE.easeIn })
      : interpolate(f, [RISE.holdEnd, RISE.outEnd], [0, -H], { ...clamp, easing: RISE.easeOut });

  const lineStart = SCENES.logoSting.lineInStartT * T;
  const labelSize = Math.round(b.w * 0.062);
  const endsWithStop = !!line && line.endsWith(".");

  return (
    <AbsoluteFill style={{ translate: `0px ${y}px`, backgroundColor: C.ink }}>
      <div style={{ position: "absolute", left: b.left, top: b.top }}>
        <Logo width={b.w} {...stopDrop(f)} />
      </div>
      {line ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: b.top + b.h + b.h * 0.55,
            height: labelSize * 1.4,
            overflow: "hidden",
            textAlign: "center",
          }}
        >
          <div
            style={{
              ...label,
              color: C.white,
              fontSize: labelSize,
              lineHeight: 1.4,
              // tracking adds space after the last letter too: pull it back so the line is centred
              marginRight: endsWithStop ? 0 : `-${tokens.type.label.trackingEm}em`,
              translate: `0px ${interpolate(f, [lineStart, lineStart + RISE.inEnd], [100, 0], { ...clamp, easing: RISE.easeIn })}%`,
            }}
          >
            {endsWithStop ? line.slice(0, -1) : line}
            {/* A closing full stop is always the square pink stop, never the font's period. */}
            {endsWithStop ? (
              <span
                style={{
                  display: "inline-block",
                  width: "0.2em",
                  height: "0.2em",
                  marginLeft: `${0.06 - tokens.type.label.trackingEm}em`,
                  backgroundColor: C.pink,
                }}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
