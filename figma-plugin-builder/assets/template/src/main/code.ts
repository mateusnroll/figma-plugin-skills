// Main/sandbox thread entry point.
//
// This half has the `figma` API (the document/scene) but NO DOM and NO network.
// It opens the UI, then reacts to messages the UI sends. See the architecture
// notes in .claude/skills/figma-plugin-builder/references/plugin-architecture.md.

import type { UiToMain, MainToUi } from "../shared/messages";
import { createShapes } from "./commands/create-shapes";
import { loadSettings, saveSettings } from "./lib/storage";

/** Convenience wrapper so messages to the UI are type-checked. */
function postToUi(message: MainToUi): void {
  figma.ui.postMessage(message);
}

// 1) Open the themed UI panel. We intentionally do NOT send anything yet — the
//    iframe might not have attached its message listener, so an early message
//    could be dropped. We wait for the UI's "ui-ready" message below instead.
figma.showUI(__html__, {
  themeColors: true, // match the user's Figma light/dark theme automatically
  width: 280,
  height: 360,
  title: "__PLUGIN_NAME__",
});

// 2) Handle messages coming from the UI iframe.
figma.ui.onmessage = async (msg: UiToMain) => {
  switch (msg.type) {
    case "ui-ready": {
      // The UI is listening — now it's safe to send the last-used settings.
      const settings = await loadSettings();
      postToUi({ type: "init", settings });
      break;
    }
    case "create-shapes": {
      const nodes = await createShapes(msg.settings);
      await saveSettings(msg.settings); // remember choices for next time
      const plural = nodes.length === 1 ? "" : "s";
      figma.notify(`Created ${nodes.length} ${msg.settings.shape}${plural}`);
      postToUi({ type: "created", count: nodes.length });
      break;
    }
    case "cancel": {
      figma.closePlugin();
      break;
    }
  }
};
