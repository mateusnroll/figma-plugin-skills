// Remember the user's last-used settings between runs.
//
// figma.clientStorage is a per-user, per-device, async key/value store. It is
// the right place for a user's own preferences (and a user's own auth token).
// It is NOT a place for shared secrets — see the security reference.

import type { Settings } from "../../shared/messages";

const KEY = "settings";

const DEFAULTS: Settings = {
  shape: "rectangle",
  count: 3,
  color: "#4F46E5",
};

export async function loadSettings(): Promise<Settings> {
  const saved = (await figma.clientStorage.getAsync(KEY)) as
    | Partial<Settings>
    | undefined;
  // Merge over defaults so a newer field is always present.
  return { ...DEFAULTS, ...(saved ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await figma.clientStorage.setAsync(KEY, settings);
}
