/* global process */
// Generates src/generated.ts from design/tokens.json (the design system's
// single source of truth). Run after editing the JSON:
//   pnpm --filter @mony/ui-tokens sync
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../../../design/tokens.json");
const target = resolve(here, "../src/generated.ts");

const tokens = JSON.parse(readFileSync(source, "utf8"));

// Loaded font keys follow @expo-google-fonts naming: `Manrope_600SemiBold`.
const WEIGHT_SUFFIX = {
  100: "Thin",
  200: "ExtraLight",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
  900: "Black",
};

function fontKey(familyRole, weight) {
  const family = tokens.typography.families[familyRole];
  if (!family) throw new Error(`Unknown font family role: ${familyRole}`);
  if (!family.weights.includes(weight)) {
    throw new Error(`${family.name} is not loaded at weight ${weight}`);
  }
  return `${family.name.replace(/\s+/g, "")}_${weight}${WEIGHT_SUFFIX[weight]}`;
}

const typeScale = Object.fromEntries(
  Object.entries(tokens.typography.scale).map(([name, style]) => [
    name,
    {
      fontFamily: fontKey(style.family, style.weight),
      fontSize: style.size,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing ?? 0,
      tabular: style.tabular ?? false,
      uppercase: style.uppercase ?? false,
    },
  ]),
);

const fontKeys = [
  ...new Set(
    Object.entries(tokens.typography.families).flatMap(([role, family]) =>
      family.weights.map((weight) => fontKey(role, weight)),
    ),
  ),
];

const json = (value) => JSON.stringify(value, null, 2);

const output = `// Generated from design/tokens.json by scripts/sync-tokens.mjs.
// Do not edit by hand: change the JSON and run \`pnpm --filter @mony/ui-tokens sync\`.

export const palette = ${json(tokens.color.palette)} as const;

export const colors = {
  light: ${json(tokens.color.light)},
  dark: ${json(tokens.color.dark)},
} as const;

export const fontKeys = ${json(fontKeys)} as const;

export const typeScale = ${json(typeScale)} as const;

export const spacing = ${json(tokens.spacing)} as const;

export const layout = ${json(tokens.layout)} as const;

export const radius = ${json(tokens.radius)} as const;

export const gradient = ${json(tokens.gradient ?? {})} as const;

export const elevation = ${json(tokens.elevation)} as const;

export const motion = ${json(tokens.motion)} as const;

export const iconSize = ${json(tokens.icon.sizes)} as const;
`;

writeFileSync(target, output);
process.stdout.write(`ui-tokens: wrote ${target}\n`);
