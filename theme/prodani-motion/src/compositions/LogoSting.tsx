import React from "react";
import { AbsoluteFill } from "remotion";
import { RisePanel } from "../Rise";
import { C } from "../tokens";

export type LogoStingProps = { readonly line?: string };

/**
 * End card for every video: on ink, the word rises in (the Rise In; the panel is ink on ink),
 * the stop drops last (the Rise hold drop), optional tracked caps line, hold.
 */
export const LogoSting: React.FC<LogoStingProps> = ({ line }) => (
  <AbsoluteFill style={{ backgroundColor: C.ink }}>
    <RisePanel mode="stay" line={line || undefined} />
  </AbsoluteFill>
);
