import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { RisePanel } from "../Rise";
import { StemWindow } from "../StemWindow";
import { C, DING_FRAME, LOGO, RISE, SCENES, clamp, headline, label } from "../tokens";

const S = SCENES.heatAndEat;

/** b-d: HEAT with a timer bar and steam, the stop drops after the T ("ding"), the H tips out, EAT. re-centres. */
const HeatWord: React.FC = () => {
  // Local frames start at the cut; the token ranges are absolute, so shift them.
  const f = useCurrentFrame() + S.cutAt;
  const { width: W, height: H } = useVideoConfig();
  const fs = Math.min(0.31 * W, 0.36 * H);
  const so = 0.18 * fs; // stop size: the logo's stop/ascender ratio applied to the caps
  const unit = so / LOGO.stop.w; // px per logo unit, so the drop distance matches the Rise

  const fill = interpolate(f, S.barFill, [0, 1], clamp); // a timer: linear
  const barGone = interpolate(f, [S.stopDropAt + 6, S.hFall[0]], [1, 0], { ...clamp, easing: RISE.easeIn });
  const stopY = interpolate(f, [S.stopDropAt, S.stopDropAt + RISE.stopDur], [RISE.stopFromY * unit, 0], {
    ...clamp,
    easing: RISE.easeDrop,
  });
  const fallLen = S.hFall[1] - S.hFall[0];
  const hRot = interpolate(f, [S.hFall[0], S.hFall[0] + fallLen * 0.6], [0, -90], { ...clamp, easing: RISE.easeDrop });
  const hDrop = interpolate(f, [S.hFall[0] + fallLen * 0.3, S.hFall[1]], [0, H], { ...clamp, easing: RISE.easeDrop });
  const recenter = interpolate(f, S.recenter, [0, 1], { ...clamp, easing: RISE.easeIn });
  const labelIn = interpolate(f, [S.barFill[0] + 2, S.barFill[0] + 2 + RISE.inEnd], [100, 0], { ...clamp, easing: RISE.easeIn });
  const labelOut = f >= S.hFall[0];

  // Three square-ended steam strokes, rising through a clip above the word while the bar fills.
  const steaming = f >= S.barFill[0] && f < S.barFill[1] + 10;
  const stroke = (i: number) => {
    const period = 24;
    const q = ((((f - S.barFill[0] - i * 8) % period) + period) % period) / period;
    const started = f - S.barFill[0] - i * 8 >= 0;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${32 + i * 18}%`,
          bottom: 0,
          width: 0.05 * fs,
          height: 0.3 * fs,
          backgroundColor: C.white,
          opacity: started ? 1 : 0,
          translate: `0px ${interpolate(q, [0, 1], [0.32 * fs, -0.62 * fs], { easing: Easing.linear })}px`,
        }}
      />
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}>
      {/* The word is centred on its own; the placeholder line hangs below it, out of the flow,
          so "EAT." re-centres on the frame (not on word + placeholder). */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", ...headline, color: C.white, fontSize: fs, lineHeight: 0.8 }}>
          {/* HEAT, with the steam above and the timer bar below */}
          <div style={{ position: "relative", display: "flex", alignItems: "baseline" }}>
            {steaming ? (
              <div style={{ position: "absolute", left: 0, right: 0, bottom: "100%", height: 0.62 * fs, marginBottom: 0.04 * fs, overflow: "hidden" }}>
                {[0, 1, 2].map(stroke)}
              </div>
            ) : null}
            {/* The H's column collapses as it falls, so EAT. re-centres without measuring text. */}
            <div style={{ display: "grid", gridTemplateColumns: `${1 - recenter}fr` }}>
              <span style={{ minWidth: 0, display: "block", transformOrigin: "0% 100%", rotate: `${hRot}deg`, translate: `0px ${hDrop}px` }}>H</span>
            </div>
            <span>EAT</span>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: -0.2 * fs,
                height: 0.07 * fs,
                transformOrigin: "100% 50%",
                scale: `${barGone} 1`,
                backgroundColor: "rgba(255,255,255,0.16)",
              }}
            >
              <div style={{ position: "absolute", inset: 0, backgroundColor: C.pink, transformOrigin: "0% 50%", scale: `${fill} 1` }} />
            </div>
          </div>
          {/* The square pink full stop after the T: the "ding". */}
          <span
            style={{
              display: "inline-block",
              width: so,
              height: so,
              marginLeft: 0.06 * fs,
              backgroundColor: C.pink,
              opacity: f >= S.stopDropAt ? 1 : 0,
              translate: `0px ${stopY}px`,
            }}
          />
        </div>
        <div style={{ position: "absolute", top: "100%", left: "50%", translate: "-50% 0", whiteSpace: "nowrap", height: 0.07 * Math.min(W, H) * 1.4, marginTop: 0.42 * fs, overflow: "hidden" }}>
          {labelOut ? null : (
            <div style={{ ...label, color: C.white, fontSize: 0.042 * Math.min(W, H), lineHeight: 1.4, translate: `0px ${labelIn}%` }}>
              {S.placeholder}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Heat and eat. a: the i becomes the cake; b-d: HEAT, ding, EAT.; e: Rise into LogoSting with the line. */
export const HeatAndEat: React.FC = () => (
  <AbsoluteFill>
    <Sequence name="a. i becomes the cake" durationInFrames={S.cutAt}>
      <StemWindow lift={S.lift} tip={S.tip} grow={S.grow} open={S.open} photo={S.photo} trayAspect={SCENES.cakeI.trayAspect} />
    </Sequence>
    <Sequence name="b-d. HEAT / ding / EAT." from={S.cutAt} durationInFrames={S.riseAt - S.cutAt + 12}>
      <HeatWord />
    </Sequence>
    <Sequence name="SFX: ding" from={DING_FRAME} durationInFrames={1} layout="none">
      <></>
    </Sequence>
    <Sequence name="e. Rise into LogoSting" from={S.riseAt}>
      <RisePanel mode="stay" line={S.line} />
    </Sequence>
  </AbsoluteFill>
);
