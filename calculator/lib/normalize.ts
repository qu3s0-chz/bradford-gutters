import type { Unit } from "./types.ts";

const units: Record<string, Unit> = {
  EA: "each",
  EACH: "each",
  PC: "each",
  LF: "per-ft",
  LB: "per-lb",
  POUND: "per-lb",
  BG: "bag",
  BA: "bag",
  BOX: "box",
  TB: "tube",
  CN: "can",
  RL: "roll",
  ROLLS: "roll",
  CASE: "case",
};

/** Maps a printed unit to a known unit, or "unclear" so it lands in review. */
export function normalizeUnit(printed: string): Unit {
  return units[printed.trim().toUpperCase()] ?? "unclear";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Price of one base unit (each, ft or lb), rounded to a hundredth of a cent. */
export function pricePerBaseUnit(
  price: number | null,
  unitsPerPurchase: number,
): number | null {
  if (!(unitsPerPurchase > 0)) {
    throw new Error(`unitsPerPurchase must be positive, got ${unitsPerPurchase}`);
  }
  if (price === null) return null;
  return Math.round((price / unitsPerPurchase) * 10000) / 10000;
}
