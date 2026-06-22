// UI iframe entry point.
//
// This half has the DOM and `fetch` but NO access to `figma`. It reads the form
// and sends typed messages to the main thread, and updates when main replies.

import "./ui.css";
import type { Settings, ShapeKind } from "../shared/messages";
import { send, onMessage } from "./lib/messenger";

const shapeEl = document.getElementById("shape") as HTMLSelectElement;
const countEl = document.getElementById("count") as HTMLInputElement;
const colorEl = document.getElementById("color") as HTMLInputElement;
const createBtn = document.getElementById("create") as HTMLButtonElement;
const cancelBtn = document.getElementById("cancel") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;

/** Read the form into a Settings object (clamped to a sane range). */
function readForm(): Settings {
  const count = Math.max(1, Math.min(50, Number(countEl.value) || 1));
  return {
    shape: shapeEl.value as ShapeKind,
    count,
    color: colorEl.value,
  };
}

/** Pre-fill the form with saved settings. */
function applySettings(settings: Settings): void {
  shapeEl.value = settings.shape;
  countEl.value = String(settings.count);
  colorEl.value = settings.color;
}

createBtn.addEventListener("click", () => {
  send({ type: "create-shapes", settings: readForm() });
});

cancelBtn.addEventListener("click", () => {
  send({ type: "cancel" });
});

onMessage((msg) => {
  if (msg.type === "init") {
    applySettings(msg.settings);
  } else if (msg.type === "created") {
    const plural = msg.count === 1 ? "shape" : "shapes";
    statusEl.textContent = `Created ${msg.count} ${plural} ✓`;
  }
});

// The listener above is attached — tell the main thread it's safe to send the
// initial state now. This avoids a race where an early message is dropped.
send({ type: "ui-ready" });
