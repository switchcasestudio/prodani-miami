import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { FONT } from "./tokens";

// Archivo variable (wght 100-900, wdth 62-125): the same file the theme ships (assets/archivo-var-latin.woff2).
loadFont({ family: FONT, url: staticFile("archivo-var-latin.woff2"), weight: "100 900", stretch: "62% 125%" });
