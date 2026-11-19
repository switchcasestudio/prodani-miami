import React from "react";
import { Composition, Folder } from "remotion";
import "./fonts";
import { CakeI } from "./compositions/CakeI";
import { HeatAndEat } from "./compositions/HeatAndEat";
import { LogoSting } from "./compositions/LogoSting";
import { Transition } from "./compositions/Transition";
import { FPS, SCENES } from "./tokens";

// Every composition in three formats. Ids: <Comp>-9x16 | -1x1 | -16x9.
export const FORMATS = [
  { id: "9x16", width: 1080, height: 1920 },
  { id: "1x1", width: 1080, height: 1080 },
  { id: "16x9", width: 1920, height: 1080 },
] as const;

export const RemotionRoot: React.FC = () => (
  <>
    {FORMATS.map((fm) => (
      <Folder key={fm.id} name={`f${fm.id}`}>
        <Composition id={`Transition-${fm.id}`} component={Transition} durationInFrames={SCENES.transition.durationFrames} fps={FPS} width={fm.width} height={fm.height} />
        <Composition id={`LogoSting-${fm.id}`} component={LogoSting} durationInFrames={SCENES.logoSting.durationFrames} fps={FPS} width={fm.width} height={fm.height} defaultProps={{ line: "" }} />
        <Composition id={`CakeI-${fm.id}`} component={CakeI} durationInFrames={SCENES.cakeI.durationFrames} fps={FPS} width={fm.width} height={fm.height} />
        <Composition id={`HeatAndEat-${fm.id}`} component={HeatAndEat} durationInFrames={SCENES.heatAndEat.durationFrames} fps={FPS} width={fm.width} height={fm.height} />
      </Folder>
    ))}
  </>
);
