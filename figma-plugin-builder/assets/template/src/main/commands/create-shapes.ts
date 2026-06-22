// One feature = one module under commands/. Replace this with your own.
//
// Demonstrates the must-know scene patterns:
//   • create nodes (synchronous), then resize/position them
//   • load a font BEFORE setting text (required, or it throws)
//   • reveal the result with the viewport
// Details: .claude/skills/figma-plugin-builder/references/writing-plugin-code.md

import type { Settings, ShapeKind } from "../../shared/messages";
import { hexToRgb } from "../lib/color";

const SIZE = 120;
const GAP = 20;

/** Create `count` shapes of the chosen kind/color near the viewport center. */
export async function createShapes(settings: Settings): Promise<SceneNode[]> {
  const { shape, count, color } = settings;
  const fill: SolidPaint = { type: "SOLID", color: hexToRgb(color) };
  const nodes: SceneNode[] = [];

  // Load the font ONCE up front when we'll create text — never inside the loop.
  if (shape === "text") {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  }

  const startX = figma.viewport.center.x;
  const startY = figma.viewport.center.y;

  for (let i = 0; i < count; i++) {
    const node = makeNode(shape, fill, i);
    node.x = startX + i * (SIZE + GAP);
    node.y = startY;
    nodes.push(node);
  }

  // Select and frame the new nodes so the user sees them.
  figma.currentPage.selection = nodes;
  figma.viewport.scrollAndZoomIntoView(nodes);
  return nodes;
}

function makeNode(shape: ShapeKind, fill: SolidPaint, index: number): SceneNode {
  switch (shape) {
    case "ellipse": {
      const ellipse = figma.createEllipse();
      ellipse.resize(SIZE, SIZE);
      ellipse.fills = [fill];
      return ellipse;
    }
    case "text": {
      const text = figma.createText();
      // Font is already loaded by the caller above.
      text.fontName = { family: "Inter", style: "Regular" };
      text.characters = `Label ${index + 1}`;
      text.fontSize = 24;
      text.fills = [fill];
      return text;
    }
    case "rectangle":
    default: {
      const rect = figma.createRectangle();
      rect.resize(SIZE, SIZE);
      rect.cornerRadius = 12;
      rect.fills = [fill];
      return rect;
    }
  }
}
