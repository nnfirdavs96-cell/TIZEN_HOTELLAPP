export const KEY = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  OK: 13,
  BACK: 10009,
  EXIT: 10182,
  RED: 403,
  GREEN: 404,
  YELLOW: 405,
  BLUE: 406,
} as const;

export type KeyCode = (typeof KEY)[keyof typeof KEY];

export type Direction = "left" | "up" | "right" | "down";

export function keyToDirection(code: number): Direction | null {
  switch (code) {
    case KEY.LEFT:
      return "left";
    case KEY.UP:
      return "up";
    case KEY.RIGHT:
      return "right";
    case KEY.DOWN:
      return "down";
    default:
      return null;
  }
}

export function registerTizenKeys(): void {
  const tizen = (window as unknown as { tizen?: { tvinputdevice?: { registerKey: (k: string) => void } } }).tizen;
  const dev = tizen?.tvinputdevice;
  if (!dev) return;
  ["ColorF0Red", "ColorF1Green", "ColorF2Yellow", "ColorF3Blue", "MediaPlayPause"].forEach((k) => {
    try {
      dev.registerKey(k);
    } catch {
      // no-op: not on Tizen or key already registered
    }
  });
}
