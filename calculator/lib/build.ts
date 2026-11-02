import { normalizeUnit, pricePerBaseUnit, slugify } from "./normalize.ts";
import type {
  CanonicalItem,
  CatalogItem,
  Category,
  Confidence,
  ReviewEntry,
  Supplier,
  Transcription,
} from "./types.ts";

export function buildCatalog(transcriptions: Transcription[]): CatalogItem[] {
  const items: CatalogItem[] = [];
  const seen = new Map<string, number>();

  for (const { supplier, sections } of transcriptions) {
    for (const section of sections) {
      for (const row of section.rows) {
        const baseId = row.id ?? `${supplier.id}:${slugify(row.text)}`;
        const count = (seen.get(baseId) ?? 0) + 1;
        seen.set(baseId, count);

        if (row.id && count > 1) throw new Error(`Duplicate explicit id ${row.id}`);

        items.push({
          id: count === 1 ? baseId : `${baseId}-${count}`,
          supplier: supplier.id,
          category: row.category ?? section.category,
          name: row.name ?? row.text,
          sku: row.sku ?? null,
          size: row.size ?? null,
          color: row.color ?? null,
          gauge: row.gauge ?? null,
          unit: normalizeUnit(row.unit),
          unitAsPrinted: row.unit,
          packQty: row.packQty ?? null,
          cartonQty: row.cartonQty ?? null,
          unitPrice: row.price,
          priceStatus: row.price === null ? "call" : (row.priceStatus ?? "listed"),
          sourceFile: supplier.sourceFile,
          page: section.page,
          section: section.section,
          priceListDate: supplier.priceListDate,
          asOf: supplier.asOf,
          rawText: row.text,
          gutterRelevant: row.gutter ?? section.gutter,
          notes: row.notes ?? [],
          review: row.review ?? [],
        });
      }
    }
  }

  return items;
}

export interface SupplierPrice {
  itemId: string;
  unitPrice: number | null;
  unit: string;
  unitsPerPurchase: number;
  perBaseUnit: number | null;
  confidence: Confidence;
  alternate: boolean;
  note: string | null;
}

export interface MappingRow {
  canonicalId: string;
  name: string;
  category: Category;
  baseUnit: string;
  status: "matched" | "single-supplier" | "no-price";
  /** Best-priced SKU per supplier, plus any alternates. */
  suppliers: Record<string, { best: SupplierPrice; others: SupplierPrice[] }>;
  cheapestSupplier: string | null;
}

export function buildMappingTable(
  canonicals: CanonicalItem[],
  catalog: CatalogItem[],
): MappingRow[] {
  const byId = new Map(catalog.map((item) => [item.id, item]));

  return canonicals.map((canonical) => {
    const grouped: Record<string, SupplierPrice[]> = {};

    for (const mapping of canonical.mappings) {
      const item = byId.get(mapping.itemId);
      if (!item) throw new Error(`${canonical.id} maps to missing item ${mapping.itemId}`);

      (grouped[item.supplier] ??= []).push({
        itemId: item.id,
        unitPrice: item.unitPrice,
        unit: item.unit,
        unitsPerPurchase: mapping.unitsPerPurchase,
        perBaseUnit: pricePerBaseUnit(item.unitPrice, mapping.unitsPerPurchase),
        confidence: mapping.confidence,
        alternate: mapping.alternate ?? false,
        note: mapping.note ?? null,
      });
    }

    const suppliers: MappingRow["suppliers"] = {};
    for (const [supplierId, prices] of Object.entries(grouped)) {
      const ranked = [...prices].sort(
        (a, b) => (a.perBaseUnit ?? Infinity) - (b.perBaseUnit ?? Infinity),
      );
      suppliers[supplierId] = { best: ranked[0], others: ranked.slice(1) };
    }

    const priced = Object.entries(suppliers).filter(
      ([, { best }]) => best.perBaseUnit !== null,
    );
    priced.sort(([, a], [, b]) => a.best.perBaseUnit! - b.best.perBaseUnit!);

    return {
      canonicalId: canonical.id,
      name: canonical.name,
      category: canonical.category,
      baseUnit: canonical.baseUnit,
      status:
        priced.length === 0
          ? "no-price"
          : Object.keys(suppliers).length > 1
            ? "matched"
            : "single-supplier",
      suppliers,
      cheapestSupplier: priced[0]?.[0] ?? null,
    };
  });
}

export function buildReview(
  suppliers: Supplier[],
  catalog: CatalogItem[],
  canonicals: CanonicalItem[],
): ReviewEntry[] {
  const entries: ReviewEntry[] = [];
  const mapped = new Set(canonicals.flatMap((c) => c.mappings.map((m) => m.itemId)));

  for (const supplier of suppliers) {
    if (!supplier.priceListDate) {
      entries.push({
        kind: "data",
        supplier: supplier.id,
        itemIds: [],
        canonicalId: null,
        message: `${supplier.name}: no date is printed on the list. Prices are treated as of the scan date, ${supplier.asOf}.`,
      });
    }
  }

  for (const item of catalog) {
    for (const message of item.review) {
      entries.push({
        kind:
          item.priceStatus === "handwritten" || /handwritten/i.test(item.rawText)
            ? "handwritten"
            : "data",
        supplier: item.supplier,
        itemIds: [item.id],
        canonicalId: null,
        message: `${item.name}: ${message}`,
      });
    }

    if (item.gutterRelevant && !mapped.has(item.id)) {
      entries.push({
        kind: "data",
        supplier: item.supplier,
        itemIds: [item.id],
        canonicalId: null,
        message: `${item.name} is a gutter item with no canonical item.`,
      });
    }
  }

  for (const supplier of suppliers) {
    const items = catalog.filter((item) => item.supplier === supplier.id);

    for (const item of items.filter((i) => i.priceStatus === "call" && i.gutterRelevant)) {
      entries.push({
        kind: "missing-price",
        supplier: supplier.id,
        itemIds: [item.id],
        canonicalId: null,
        message: `${item.name}: listed as "call" with no price.`,
      });
    }

    const otherCalls = items.filter((i) => i.priceStatus === "call" && !i.gutterRelevant);
    if (otherCalls.length > 0) {
      entries.push({
        kind: "missing-price",
        supplier: supplier.id,
        itemIds: otherCalls.map((i) => i.id),
        canonicalId: null,
        message: `${otherCalls.length} non-gutter ${supplier.name} items are "call" with no price. No action needed unless you quote them.`,
      });
    }

    const unclear = items.filter((i) => i.unit === "unclear" && i.priceStatus !== "call");
    for (const [printed, group] of Object.entries(
      Object.groupBy(unclear, (i) => i.unitAsPrinted),
    )) {
      entries.push({
        kind: "unclear-unit",
        supplier: supplier.id,
        itemIds: group!.map((i) => i.id),
        canonicalId: null,
        message: `${group!.length} ${supplier.name} items are priced per "${printed}", which isn't explained on the list.`,
      });
    }

    const cartons = items.filter((i) => i.cartonQty !== null);
    if (cartons.length > 0) {
      entries.push({
        kind: "pack-size",
        supplier: supplier.id,
        itemIds: [],
        canonicalId: null,
        message: `${supplier.name} prices ${cartons.length} items per piece and also prints a carton quantity. Can you buy loose pieces, or only full cartons? This decides how the calculator rounds up.`,
      });
    }
  }

  for (const canonical of canonicals) {
    for (const mapping of canonical.mappings) {
      if (mapping.confidence === "high") continue;
      entries.push({
        kind: "match",
        supplier: catalog.find((i) => i.id === mapping.itemId)?.supplier ?? null,
        itemIds: [mapping.itemId],
        canonicalId: canonical.id,
        message: `${canonical.name}: ${mapping.confidence}-confidence match. ${mapping.note ?? ""}`.trim(),
      });
    }
  }

  return entries;
}

export function toCsv(rows: (string | number | boolean | null)[][]): string {
  const cell = (value: string | number | boolean | null) => {
    const text = value === null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  // The byte order mark makes Excel read the file as UTF-8.
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
