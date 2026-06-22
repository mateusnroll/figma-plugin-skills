// The typed contract between the two halves of the plugin.
//
// The main/sandbox thread (src/main) and the UI iframe (src/ui) can ONLY talk
// by passing messages. Declaring every message here — and importing these types
// on both sides — means the compiler catches a typo or a wrong shape before the
// plugin ever runs. This is the backbone of a maintainable plugin; grow these
// unions as you add features.

export type ShapeKind = "rectangle" | "ellipse" | "text";

export interface Settings {
  shape: ShapeKind;
  count: number;
  /** Hex color like "#4F46E5". */
  color: string;
}

/** Messages sent FROM the UI iframe TO the main/sandbox thread. */
export type UiToMain =
  // Sent once, after the UI has attached its message listener. The main thread
  // waits for this before sending initial state, so the first message can't
  // arrive before the UI is ready to receive it.
  | { type: "ui-ready" }
  | { type: "create-shapes"; settings: Settings }
  | { type: "cancel" };

/** Messages sent FROM the main/sandbox thread TO the UI iframe. */
export type MainToUi =
  | { type: "init"; settings: Settings }
  | { type: "created"; count: number };
