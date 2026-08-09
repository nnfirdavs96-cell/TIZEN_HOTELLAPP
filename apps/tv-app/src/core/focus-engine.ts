import type { Direction } from "./keys";

const FOCUSABLE_SELECTOR = '[data-focusable="true"]:not([disabled]):not([aria-hidden="true"])';

export function getFocusableElements(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

interface Rect {
  cx: number;
  cy: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return {
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
  };
}

function isInDirection(from: Rect, to: Rect, dir: Direction): boolean {
  const eps = 4;
  switch (dir) {
    case "left":
      return to.right <= from.left + eps;
    case "right":
      return to.left >= from.right - eps;
    case "up":
      return to.bottom <= from.top + eps;
    case "down":
      return to.top >= from.bottom - eps;
  }
}

function score(from: Rect, to: Rect, dir: Direction): number {
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const primary = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
  const secondary = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
  return primary + secondary * 2;
}

export function findNearestFocusable(
  current: HTMLElement | null,
  dir: Direction,
  root: ParentNode = document,
): HTMLElement | null {
  const all = getFocusableElements(root).filter((el) => el !== current);
  if (!current) return all[0] ?? null;
  const from = rectOf(current);
  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const el of all) {
    const to = rectOf(el);
    if (!isInDirection(from, to, dir)) continue;
    const s = score(from, to, dir);
    if (s < bestScore) {
      bestScore = s;
      best = el;
    }
  }
  return best;
}

export function focusFirst(root: ParentNode = document): HTMLElement | null {
  const first = getFocusableElements(root)[0] ?? null;
  first?.focus();
  return first;
}

export function focusById(id: string): HTMLElement | null {
  const el = document.getElementById(id);
  if (el && el.matches(FOCUSABLE_SELECTOR)) {
    el.focus();
    return el;
  }
  return null;
}
