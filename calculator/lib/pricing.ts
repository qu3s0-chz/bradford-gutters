import type { JobInput, MaterialNeed } from "./calculate.ts";
import type { PricingData, PricingItem } from "./data.ts";
import { supplierSettings, type CalculatorSettings, type SupplierSettings } from "./settings.ts";
import type { CanonicalItem, Unit } from "./types.ts";

export const money = (value: number) => Math.round(value * 100) / 100;

const purchaseUnitLabels: Record<Unit, string> = {
  each: "pc",
  "per-ft": "ft",
  "per-lb": "lb",
  bag: "bag",
  box: "box",
  tube: "tube",
  can: "can",
  roll: "roll",
  case: "case",
  unclear: "unit",
};

export type SupplierLine =
  | {
      status: "priced";
      itemId: string;
      itemName: string;
      purchaseQty: number;
      purchaseUnit: string;
      unitPrice: number;
      total: number;
      roundedToCarton: boolean;
    }
  | { status: "not-carried" }
  | { status: "no-price"; itemId: string; itemName: string };

/** Cheapest way to buy one need from one supplier, rounded to what can be bought. */
export function priceForSupplier(
  need: MaterialNeed,
  canonical: CanonicalItem | undefined,
  supplierId: string,
  items: Map<string, PricingItem>,
  settings: SupplierSettings,
): SupplierLine {
  const options = (canonical?.mappings ?? [])
    .map((mapping) => ({ mapping, item: items.get(mapping.itemId) }))
    .filter(
      (option): option is { mapping: typeof option.mapping; item: PricingItem } =>
        option.item !== undefined &&
        option.item.supplier === supplierId &&
        !option.item.discontinued,
    );

  if (options.length === 0) return { status: "not-carried" };

  let best: Extract<SupplierLine, { status: "priced" }> | null = null;

  for (const { mapping, item } of options) {
    if (item.unitPrice === null) continue;

    let purchaseQty = Math.ceil(need.quantity / mapping.unitsPerPurchase - 1e-9);
    let roundedToCarton = false;
    if (settings.fullCartonsOnly && item.cartonQty && item.cartonQty > 1) {
      const cartons = Math.ceil(purchaseQty / item.cartonQty);
      roundedToCarton = cartons * item.cartonQty !== purchaseQty;
      purchaseQty = cartons * item.cartonQty;
    }

    const total = money(purchaseQty * item.unitPrice);
    if (!best || total < best.total) {
      best = {
        status: "priced",
        itemId: item.id,
        itemName: item.name,
        purchaseQty,
        // A priced "each" that covers several base units is a pack, such as a bag of 100 screws.
        purchaseUnit:
          item.unit === "each" && canonical?.baseUnit === "each" && mapping.unitsPerPurchase > 1
            ? `pack of ${mapping.unitsPerPurchase}`
            : purchaseUnitLabels[item.unit],
        unitPrice: item.unitPrice,
        total,
        roundedToCarton,
      };
    }
  }

  return best ?? { status: "no-price", itemId: options[0].item.id, itemName: options[0].item.name };
}

export interface SupplierTotals {
  supplierId: string;
  subtotal: number;
  tax: number;
  delivery: number;
  total: number;
  /** Canonical ids this supplier can't price. */
  missing: string[];
  minimumOrder: number;
  belowMinimum: boolean;
}

export function supplierTotals(
  supplierId: string,
  lines: { canonicalId: string; line: SupplierLine }[],
  settings: SupplierSettings,
): SupplierTotals {
  const subtotal = money(
    lines.reduce((sum, { line }) => sum + (line.status === "priced" ? line.total : 0), 0),
  );
  const tax = money((subtotal * settings.taxRatePct) / 100);
  const delivery = subtotal > 0 ? money(settings.deliveryFee) : 0;

  return {
    supplierId,
    subtotal,
    tax,
    delivery,
    total: money(subtotal + tax + delivery),
    missing: lines.filter(({ line }) => line.status !== "priced").map(({ canonicalId }) => canonicalId),
    minimumOrder: settings.minimumOrder,
    belowMinimum: subtotal > 0 && subtotal < settings.minimumOrder,
  };
}

export interface ComparisonLine {
  need: MaterialNeed;
  name: string;
  baseUnit: string;
  bySupplier: Record<string, SupplierLine>;
  /** Supplier with the lowest line total, or null if nobody prices it. */
  cheapest: string | null;
}

export interface MixResult {
  /** Canonical id to the supplier it's bought from. */
  picks: Record<string, string | null>;
  suppliers: string[];
  totals: SupplierTotals[];
  total: number;
  /** Items no enabled supplier can price. */
  missing: string[];
  bestSingle: SupplierTotals | null;
  savingsVsBestSingle: number | null;
}

export interface Comparison {
  suppliers: string[];
  lines: ComparisonLine[];
  totals: Record<string, SupplierTotals>;
  /** Cheapest supplier that can price every item anyone can price. */
  bestSingle: SupplierTotals | null;
  mix: MixResult;
}

export function compareSuppliers(
  needs: MaterialNeed[],
  data: PricingData,
  settings: CalculatorSettings,
): Comparison {
  const suppliers = data.suppliers
    .map((s) => s.id)
    .filter((id) => supplierSettings(settings, id).enabled);
  const items = new Map(data.items.map((item) => [item.id, item]));
  const canonical = new Map(data.canonical.map((c) => [c.id, c]));

  const lines: ComparisonLine[] = needs.map((need) => {
    const item = canonical.get(need.canonicalId);
    const bySupplier: Record<string, SupplierLine> = {};
    for (const id of suppliers) {
      bySupplier[id] = priceForSupplier(need, item, id, items, supplierSettings(settings, id));
    }
    return {
      need,
      name: item?.name ?? need.canonicalId,
      baseUnit: item?.baseUnit ?? "each",
      bySupplier,
      cheapest: cheapestOf(bySupplier, suppliers),
    };
  });

  const totals: Record<string, SupplierTotals> = {};
  for (const id of suppliers) {
    totals[id] = supplierTotals(
      id,
      lines.map((line) => ({ canonicalId: line.need.canonicalId, line: line.bySupplier[id] })),
      supplierSettings(settings, id),
    );
  }

  const priceable = lines.filter((line) => line.cheapest !== null).map((l) => l.need.canonicalId);
  const bestSingle = cheapestComplete(Object.values(totals), priceable);
  const mix = cheapestMix(lines, suppliers, settings, bestSingle);

  return { suppliers, lines, totals, bestSingle, mix };
}

function cheapestOf(bySupplier: Record<string, SupplierLine>, suppliers: string[]): string | null {
  let best: string | null = null;
  for (const id of suppliers) {
    const line = bySupplier[id];
    if (line.status !== "priced") continue;
    const current = best ? bySupplier[best] : null;
    if (!current || (current.status === "priced" && line.total < current.total)) best = id;
  }
  return best;
}

function cheapestComplete(totals: SupplierTotals[], priceable: string[]): SupplierTotals | null {
  const complete = totals.filter((t) => priceable.every((id) => !t.missing.includes(id)));
  return complete.sort((a, b) => a.total - b.total)[0] ?? null;
}

/**
 * Tries every combination of suppliers, buys each item from the cheapest one
 * in the combination, and keeps the cheapest complete combination. Each extra
 * stop adds extraStopCost to the comparison only, not to the reported total.
 */
function cheapestMix(
  lines: ComparisonLine[],
  suppliers: string[],
  settings: CalculatorSettings,
  bestSingle: SupplierTotals | null,
): MixResult {
  const priceable = lines.filter((line) => line.cheapest !== null);
  const missing = lines.filter((line) => line.cheapest === null).map((l) => l.need.canonicalId);
  let best: { score: number; result: MixResult } | null = null;

  for (let mask = 1; mask < 1 << suppliers.length; mask++) {
    const subset = suppliers.filter((_, i) => mask & (1 << i));
    const picks: Record<string, string | null> = {};
    let complete = true;

    for (const line of priceable) {
      const pick = cheapestOf(line.bySupplier, subset);
      if (!pick) {
        complete = false;
        break;
      }
      picks[line.need.canonicalId] = pick;
    }
    if (!complete) continue;

    const used = subset.filter((id) => Object.values(picks).includes(id));
    if (used.length !== subset.length) continue;

    const totals = used.map((id) =>
      supplierTotals(
        id,
        priceable
          .filter((line) => picks[line.need.canonicalId] === id)
          .map((line) => ({ canonicalId: line.need.canonicalId, line: line.bySupplier[id] })),
        supplierSettings(settings, id),
      ),
    );
    const total = money(totals.reduce((sum, t) => sum + t.total, 0));
    const score = total + Math.max(0, used.length - 1) * settings.extraStopCost;

    if (!best || score < best.score - 0.001) {
      best = {
        score,
        result: {
          picks,
          suppliers: used,
          totals,
          total,
          missing,
          bestSingle,
          savingsVsBestSingle: bestSingle ? money(bestSingle.total - total) : null,
        },
      };
    }
  }

  const result: MixResult = best?.result ?? {
    picks: {},
    suppliers: [],
    totals: [],
    total: 0,
    missing,
    bestSingle,
    savingsVsBestSingle: null,
  };
  for (const id of missing) result.picks[id] = null;
  return result;
}

export interface QuoteSummary {
  materials: number;
  markup: number;
  labor: number;
  tearOff: number;
  price: number;
  grossProfit: number;
  /** Margin after materials only. Labor cost isn't modeled. */
  marginPct: number;
}

export function suggestQuote(
  materials: number,
  job: JobInput,
  gutterFt: number,
  settings: CalculatorSettings,
): QuoteSummary {
  const markup = money((materials * settings.markupPct) / 100);
  const labor = money(settings.labor.mode === "per-ft" ? gutterFt * settings.labor.rate : settings.labor.rate);
  const tearOff = job.tearOff ? money(gutterFt * settings.tearOff.perFt + settings.tearOff.haulAwayFee) : 0;
  const price = money(materials + markup + labor + tearOff);
  const grossProfit = money(price - materials);

  return {
    materials,
    markup,
    labor,
    tearOff,
    price,
    grossProfit,
    marginPct: price > 0 ? Math.round((grossProfit / price) * 1000) / 10 : 0,
  };
}
