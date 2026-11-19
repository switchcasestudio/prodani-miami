import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { RisePanel } from "../Rise";
import { C, RISE } from "../tokens";

/** A neutral stand-in for a web page: bone, with flat ink blocks. No copy. */
const Page: React.FC<{ readonly variant: "a" | "b" }> = ({ variant }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 20;
  const block = (l: number, t: number, w: number, h: number, c: string = C.ink) => (
    <div style={{ position: "absolute", left: l * u, top: t * u, width: w * u, height: h * u, backgroundColor: c }} />
  );
  return (
    <AbsoluteFill style={{ backgroundColor: C.bone }}>
      {block(1, 1, W / u - 2, 0.6)}
      {variant === "a" ? (
        <>
          {block(1, 3, 11, 2.2)}
          {block(1, 5.8, 8, 2.2)}
          {block(1, 9, 6, 0.5)}
          {block(1, 10, 7, 0.5)}
          {block(1, 11.6, 3.2, 1.1, C.berry)}
        </>
      ) : (
        <>
          {block(1, 3, W / u - 2, Math.min(7, H / u - 9), "#E4DBCF")}
          {block(1, Math.min(10.6, H / u - 5.4), 9, 1.6)}
          {block(1, Math.min(13, H / u - 3), 5, 0.5)}
        </>
      )}
    </AbsoluteFill>
  );
};

/** The Rise move, 1 T = 30 frames: the reference for the theme loader (assets/pd-transition.*). */
export const Transition: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {/* The next page takes over underneath once the panel covers the frame. */}
      <Page variant={f < RISE.inEnd ? "a" : "b"} />
      <Sequence name="Rise" layout="none">
        <RisePanel mode="through" />
      </Sequence>
    </AbsoluteFill>
  );
};
