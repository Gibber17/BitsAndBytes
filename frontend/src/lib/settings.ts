export type Theme = "light" | "dark" | "system";
export type TextSize = "small" | "default" | "large" | "xl";

export interface Settings {
  displayName: string;
  theme: Theme;
  textSize: TextSize;
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  displayName: "",
  theme: "system",
  textSize: "default",
  reduceMotion: false,
};

const STORAGE_KEY = "knight-study-settings";

// Settings live in localStorage, so they only apply to this device.
export function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be blocked (private mode); settings just won't persist.
  }
}
