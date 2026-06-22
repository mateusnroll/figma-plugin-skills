// A tiny typed wrapper over the postMessage bridge.
//
// It hides the wrap/unwrap asymmetry: the UI must wrap outgoing payloads in
// { pluginMessage } and read incoming ones from event.data.pluginMessage.
// Using these two functions everywhere keeps the rest of the UI code clean and
// type-safe against src/shared/messages.ts.

import type { UiToMain, MainToUi } from "../../shared/messages";

/** Send a typed message to the main/sandbox thread. */
export function send(message: UiToMain): void {
  parent.postMessage({ pluginMessage: message }, "*");
}

/** Subscribe to typed messages coming from the main/sandbox thread. */
export function onMessage(handler: (message: MainToUi) => void): void {
  window.onmessage = (event: MessageEvent) => {
    const message = event.data.pluginMessage as MainToUi | undefined;
    if (message) handler(message);
  };
}
