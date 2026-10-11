import type { Transition } from "motion/react";

/**
 * WRMax DS · Animações. One curve for everything (macOS-like: starts fast,
 * settles slowly): cubic-bezier(0.32, 0.72, 0, 1).
 * Rules: nothing moves by itself when a page opens — motion answers a person's
 * action; one striking animation per screen; prefers-reduced-motion always wins.
 */

export const EASE_MAC: [number, number, number, number] = [0.32, 0.72, 0, 1];

export const DURATION = {
  /** Fades and colour changes. */
  fade: 0.5,
  /** Slides (sliding pill, side entrance). */
  slide: 0.7,
  /** Content swaps (numbers changing with the period). */
  swap: 0.75,
} as const;

/** The sliding gold pill behind the active tab / nav item. */
export const PILL: Transition = { duration: DURATION.slide, ease: EASE_MAC };

/** Side entrance distance for a section/page change. */
export const ENTRANCE_OFFSET = 56;
