// Color helpers for the main thread.

/**
 * Convert a "#RRGGBB" (or shorthand "#RGB") hex string to the { r, g, b } object
 * Figma expects, where each channel is 0–1. Falls back to black on bad input.
 */
export function hexToRgb(hex: string): RGB {
  let h = hex.replace(/^#/, "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(int)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: ((int >> 16) & 255) / 255,
    g: ((int >> 8) & 255) / 255,
    b: (int & 255) / 255,
  };
}

// NOTE: `fills`/`strokes` on existing nodes are READONLY arrays — you cannot
// mutate them in place. To change an existing node's fill, clone the array,
// edit the copy, and reassign the whole property. (When you build a brand-new
// array, as create-shapes does, no clone is needed.) Figma also ships
// `figma.util.solidPaint("#RRGGBB", existing)` for the clone-and-set case.
