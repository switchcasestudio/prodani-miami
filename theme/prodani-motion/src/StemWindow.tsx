import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Logo, logoBox, toPx } from "./Logo";
import { C, LOGO, RISE, clamp } from "./tokens";

type Range = readonly number[];
type Props = {
  /** Frame ranges (local): lift out of the word, tip 90deg, grow into the window, open the window. */
  readonly lift: Range;
  readonly tip: Range;
  readonly grow: Range;
  readonly open: Range;
  readonly photo: string;
  readonly trayAspect: number;
};

/**
 * Product reveal: the i's stem lifts out of the word, tips onto its side, scales up (its 1 : 2.8
 * becomes the tray's 1 : 2.6) and opens as a window onto the tray photo. The word, now without
 * its stem, settles under the window.
 */
export const StemWindow: React.FC<Props> = ({ lift, tip, grow, open, photo, trayAspect }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const b = logoBox(W, H);
  const ease = RISE.easeIn;
  const p = (r: Range) => interpolate(f, [r[0], r[1]], [0, 1], { ...clamp, easing: ease });

  // The stem where it sits in the word, in px.
  const st = toPx(b, LOGO.iStem.x, LOGO.iStem.y);
  const sw = LOGO.iStem.w * b.s;
  const sh = LOGO.iStem.h * b.s;
  const cx0 = st.x + sw / 2;
  const cy0 = st.y + sh / 2;

  // The window: as wide as the frame allows, tray proportions. Window over word, stacked, centred.
  const Ww = Math.min(0.86 * W, 1.2 * H);
  const Wh = Ww / trayAspect;
  const gap = 0.55 * b.h;
  const top = (H - (Wh + gap + b.h)) / 2;
  const wcx = W / 2;
  const wcy = top + Wh / 2;
  const wordDy = top + Wh + gap - b.top;

  const pl = p(lift);
  const pt = p(tip);
  const pg = p(grow);
  const po = p(open);

  const liftDist = 1.45 * sh;
  const cx = interpolate(pg, [0, 1], [cx0, wcx]);
  const cy = interpolate(pg, [0, 1], [cy0 - liftDist * pl, wcy]);

  // Until it has tipped, the stem is a vertical bar rotating; after, an unrotated horizontal box
  // (a solid white bar looks the same either way), which then grows into the window.
  const tipped = pt >= 1;
  const w = tipped ? interpolate(pg, [0, 1], [sh, Ww]) : sw;
  const h = tipped ? interpolate(pg, [0, 1], [sw, Wh]) : sh;
  const rot = tipped ? 0 : 90 * pt;

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <div style={{ position: "absolute", left: b.left, top: b.top, translate: `0px ${wordDy * pg}px` }}>
        <Logo width={b.w} stemVisible={false} />
      </div>
      <div
        style={{
          position: "absolute",
          left: cx - w / 2,
          top: cy - h / 2,
          width: w,
          height: h,
          rotate: `${rot}deg`,
          overflow: "hidden",
          backgroundColor: C.bone,
        }}
      >
        {po > 0 ? (
          <Img
            src={staticFile(photo)}
            style={{
              position: "absolute",
              width: h,
              height: w,
              left: (w - h) / 2,
              top: (h - w) / 2,
              rotate: "90deg",
              objectFit: "cover",
            }}
          />
        ) : null}
        {/* The white of the stem, lifting like a shutter to open the window. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: C.white,
            transformOrigin: "50% 0%",
            scale: `1 ${1 - po}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
