import { colors } from "../theme";

// DESIGN.md's category roles: Food/Cafe = accent, Trek/nature = trail, everything else = ink
const CATEGORY_COLOR: Record<string, string> = {
  food: colors.accent,
  cafe: colors.accent,
  trek: colors.trail,
};

export function categoryColor(category: string): string {
  return CATEGORY_COLOR[category] ?? colors.ink;
}

// Icon path data shared with design/mockup-musa.html, so the map pins and
// the bottom-sheet filter chips draw the same glyph per category.
export const CATEGORY_ICON_PATH: Record<string, string> = {
  food: "M6 2v9a2 2 0 0 0 2 2v9M6 2c-1.5 1.5-1.5 5.5 0 9M18 2v20M14 2v8a4 4 0 0 0 4 4",
  cafe: "M10 3v3M6 3v3M4 8h13a3 3 0 0 1 0 6h-1M4 8v6a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8",
  viewpoint: "M3 6h18v14H3zM12 13a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  temple: "M12 3l8 6v12H4V9z",
  trek: "M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 20l2-6-3-2 2-5 4 1 3 4-2 1 3 7",
  rest_stop: "M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18v2M21 18v2M3 12V8a2 2 0 0 1 2-2h4v4",
};

export function categoryIconPath(category: string): string {
  return CATEGORY_ICON_PATH[category] ?? CATEGORY_ICON_PATH.viewpoint;
}
