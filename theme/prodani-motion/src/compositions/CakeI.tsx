import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { RisePanel } from "../Rise";
import { StemWindow } from "../StemWindow";
import { SCENES } from "../tokens";

const S = SCENES.cakeI;

/** The letter i is the cake: the stem lifts out, tips, grows into a window on the tray, then Rise into LogoSting. */
export const CakeI: React.FC = () => (
  <AbsoluteFill>
    <Sequence name="i becomes the cake" durationInFrames={S.riseAt + 12}>
      <StemWindow lift={S.lift} tip={S.tip} grow={S.grow} open={S.open} photo={S.photo} trayAspect={S.trayAspect} />
    </Sequence>
    <Sequence name="Rise into LogoSting" from={S.riseAt}>
      <RisePanel mode="stay" />
    </Sequence>
  </AbsoluteFill>
);
