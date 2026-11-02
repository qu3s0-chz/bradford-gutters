import { slugify } from "./normalize.ts";
import type { CalculatorSettings } from "./settings.ts";
import type { CanonicalItem, PriceStatus, Unit } from "./types.ts";

export interface PricingSupplier {
  id: string;
  name: string;
  asOf: string;
  priceListDate: string | null;
}

/** The slice of a catalog item the calculator needs. */
export interface PricingItem {
  id: string;
  supplier: string;
  name: string;
  sku: string | null;
  unit: Unit;
  unitPrice: number | null;
  priceStatus: PriceStatus;
  cartonQty: number | null;
  page: number | null;
  /** Missing from the latest imported list. Kept so mappings don't break. */
  discontinued?: boolean;
  /** Price edited in settings. */
  overridden?: boolean;
}

export interface PricingData {
  suppliers: PricingSupplier[];
  items: PricingItem[];
  canonical: CanonicalItem[];
}

/** Applies imported price lists, price overrides and mapping overrides. */
export function resolvePricingData(
  base: PricingData,
  settings: CalculatorSettings,
): PricingData {
  const suppliers = base.suppliers.map((supplier) => {
    const imported = settings.priceLists[supplier.id];
    return imported ? { ...supplier, asOf: imported.asOf, priceListDate: imported.asOf } : supplier;
  });

  const items = base.suppliers
    .flatMap((supplier) =>
      settings.priceLists[supplier.id]?.items ??
      base.items.filter((item) => item.supplier === supplier.id),
    )
    .map((item) => {
      const override = settings.priceOverrides[item.id];
      return override === undefined ? item : { ...item, unitPrice: override, overridden: true };
    });

  const canonical = base.canonical.map((item) => {
    const mappings = settings.mappingOverrides[item.id];
    return mappings ? { ...item, mappings } : item;
  });

  return { suppliers, items, canonical };
}

export interface PriceListDiff {
  priceChanges: { id: string; name: string; from: number | null; to: number | null }[];
  added: PricingItem[];
  removed: PricingItem[];
  unchanged: number;
}

export function diffPriceList(current: PricingItem[], incoming: PricingItem[]): PriceListDiff {
  const currentById = new Map(current.filter((i) => !i.discontinued).map((i) => [i.id, i]));
  const incomingIds = new Set(incoming.map((i) => i.id));
  const diff: PriceListDiff = { priceChanges: [], added: [], removed: [], unchanged: 0 };

  for (const item of incoming) {
    const existing = currentById.get(item.id);
    if (!existing) diff.added.push(item);
    else if (existing.unitPrice !== item.unitPrice) {
      diff.priceChanges.push({ id: item.id, name: item.name, from: existing.unitPrice, to: item.unitPrice });
    } else diff.unchanged += 1;
  }

  diff.removed = [...currentById.values()].filter((i) => !incomingIds.has(i.id));
  return diff;
}

/** New list wins; items it dropped stay, marked discontinued. */
export function mergePriceList(current: PricingItem[], incoming: PricingItem[]): PricingItem[] {
  const incomingIds = new Set(incoming.map((i) => i.id));
  return [
    ...incoming,
    ...current
      .filter((item) => !incomingIds.has(item.id))
      .map((item) => ({ ...item, discontinued: true })),
  ];
}

const units: Unit[] = ["each", "per-ft", "per-lb", "bag", "box", "tube", "can", "roll", "case", "unclear"];

/**
 * Reads a price list CSV in the catalog.csv format. Needs a unit_price column
 * and either id or name. Rows for other suppliers and rows marked
 * gutter_relevant=false are skipped.
 */
export function priceListFromCsv(
  rows: string[][],
  supplierId: string,
): { items: PricingItem[]; errors: string[] } {
  const [header, ...body] = rows;
  const errors: string[] = [];
  if (!header) return { items: [], errors: ["The file is empty."] };

  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const idCol = col("id");
  const nameCol = col("name");
  const priceCol = col("unit_price");
  const supplierCol = col("supplier");
  const gutterCol = col("gutter_relevant");

  if (priceCol < 0) errors.push('Missing a "unit_price" column.');
  if (idCol < 0 && nameCol < 0) errors.push('Needs an "id" or "name" column.');
  if (errors.length > 0) return { items: [], errors };

  const items: PricingItem[] = [];
  const seen = new Set<string>();

  body.forEach((row, index) => {
    const line = index + 2;
    const cell = (c: number) => (c >= 0 ? (row[c] ?? "").trim() : "");
    if (row.every((value) => value.trim() === "")) return;
    if (supplierCol >= 0 && cell(supplierCol) && cell(supplierCol) !== supplierId) return;
    if (gutterCol >= 0 && cell(gutterCol).toLowerCase() === "false") return;

    const name = cell(nameCol) || cell(idCol);
    const id = cell(idCol) || `${supplierId}:${slugify(name)}`;
    const priceText = cell(priceCol).replace(/[$,]/g, "");
    const price = priceText === "" || /^call$/i.test(priceText) ? null : Number(priceText);

    if (price !== null && !(Number.isFinite(price) && price >= 0)) {
      errors.push(`Line ${line}: "${cell(priceCol)}" is not a price.`);
      return;
    }
    if (seen.has(id)) {
      errors.push(`Line ${line}: duplicate id ${id}.`);
      return;
    }
    seen.add(id);

    const unit = cell(col("unit")) as Unit;
    const carton = Number(cell(col("carton_qty")));
    const page = Number(cell(col("page")));

    items.push({
      id,
      supplier: supplierId,
      name,
      sku: cell(col("sku")) || null,
      unit: units.includes(unit) ? unit : "each",
      unitPrice: price,
      priceStatus: price === null ? "call" : "listed",
      cartonQty: carton > 0 ? carton : null,
      page: page > 0 ? page : null,
    });
  });

  return { items, errors };
}
