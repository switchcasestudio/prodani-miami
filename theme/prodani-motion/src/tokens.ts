// Typed view of motion-tokens.json, the single source of truth shared with the theme loader.
// Nothing here may restate a number that lives in the JSON: derive it.
import { Easing } from "remotion";
import tokens from "./motion-tokens.json";

export { tokens };

type Bezier = readonly [number, number, number, number] | number[];
export const bezier = (b: Bezier) => Easing.bezier(b[0], b[1], b[2], b[3]);

const { rise, tempo } = tokens;
/** Frames per T (1000 ms at 30 fps = 30 frames). */
export const T = tempo.framesPerT;
export const FPS = tempo.fps;

/** The Rise move in frames, relative to its own start. */
export const RISE = {
  inEnd: rise.in.share * T, // 9.6
  holdEnd: (rise.in.share + rise.hold.share) * T, // 20.4
  outEnd: (rise.in.share + rise.hold.share + rise.out.share) * T, // 30
  stopStart: (rise.in.share + rise.hold.share * rise.stopDrop.startInHold) * T, // 10.68
  stopDur: rise.hold.share * rise.stopDrop.durationInHold * T, // 4.32
  stopFromY: rise.stopDrop.fromY,
  easeIn: bezier(rise.in.easing),
  easeOut: bezier(rise.out.easing),
  easeDrop: bezier(rise.stopDrop.easing),
};

export const C = tokens.colors;
export const LOGO = tokens.logo;
export const SCENES = tokens.scenes;

/** Frame the "ding" SFX belongs on in HeatAndEat: the frame the stop lands. */
export const DING_FRAME = Math.round(SCENES.heatAndEat.stopDropAt + RISE.stopDur);

export const FONT = "Archivo";
export const headline = {
  fontFamily: FONT,
  fontWeight: tokens.type.headline.weight,
  fontStretch: `${tokens.type.headline.widthPct}%`,
  fontVariationSettings: `'wdth' ${tokens.type.headline.widthPct}`,
} as const;
export const label = {
  fontFamily: FONT,
  fontWeight: tokens.type.label.weight,
  textTransform: "uppercase",
  letterSpacing: `${tokens.type.label.trackingEm}em`,
} as const;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
