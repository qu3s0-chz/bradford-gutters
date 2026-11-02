import { describe, expect, it } from "vitest";
import { canonicalItems } from "../data/canonical.ts";
import { spectra } from "../data/transcriptions/spectra.ts";
import { townCountry } from "../data/transcriptions/town-country.ts";
import { buildCatalog, buildMappingTable, buildReview, toCsv } from "../lib/build.ts";
import { normalizeUnit, pricePerBaseUnit, slugify } from "../lib/normalize.ts";
import type { Transcription } from "../lib/types.ts";

const fixture: Transcription = {
  supplier: {
    id: "a",
    name: "Supplier A",
    account: null,
    sourceFile: "a.pdf",
    pages: 1,
    priceListDate: null,
    asOf: "2026-11-01",
    notes: [],
  },
  sections: [
    {
      page: 1,
      section: "TEST",
      category: "elbows",
      gutter: true,
      rows: [
        { id: "a:elbow", text: "ELBOW 3X4", price: 2, unit: "PC" },
        { text: "SAME TEXT", price: 1, unit: "EA", gutter: false },
        { text: "SAME TEXT", price: 1.5, unit: "EA", gutter: false },
        { text: "ASK US", price: null, unit: "call", gutter: false },
        { text: "MYSTERY", price: 3, unit: "PL", gutter: false },
      ],
    },
  ],
};

describe("normalizeUnit", () => {
  it("maps printed units", () => {
    expect(normalizeUnit("EA")).toBe("each");
    expect(normalizeUnit("pc")).toBe("each");
    expect(normalizeUnit("LF")).toBe("per-ft");
    expect(normalizeUnit("Pound")).toBe("per-lb");
    expect(normalizeUnit("BA")).toBe("bag");
  });

  it("does not guess unknown units", () => {
    expect(normalizeUnit("PL")).toBe("unclear");
  });
});

describe("pricePerBaseUnit", () => {
  it("divides by the units in one purchase", () => {
    expect(pricePerBaseUnit(19.52, 10)).toBe(1.952);
    expect(pricePerBaseUnit(2.88, 100)).toBe(0.0288);
  });

  it("keeps missing prices missing", () => {
    expect(pricePerBaseUnit(null, 10)).toBeNull();
  });

  it("rejects a zero divisor", () => {
    expect(() => pricePerBaseUnit(5, 0)).toThrow();
  });
});

describe("slugify", () => {
  it("makes stable ids from printed text", () => {
    expect(slugify(`ALUM 3 X4 10' DOWNSPOUT FROST`)).toBe("alum-3-x4-10-downspout-frost");
  });
});

describe("buildCatalog", () => {
  const items = buildCatalog([fixture]);

  it("keeps duplicate descriptions as separate items", () => {
    expect(items.map((i) => i.id)).toContain("a:same-text");
    expect(items.map((i) => i.id)).toContain("a:same-text-2");
  });

  it("marks call-for-price items without inventing a price", () => {
    const item = items.find((i) => i.rawText === "ASK US")!;
    expect(item.unitPrice).toBeNull();
    expect(item.priceStatus).toBe("call");
  });

  it("inherits category and gutter flag from the section", () => {
    expect(items[0].category).toBe("elbows");
    expect(items[0].gutterRelevant).toBe(true);
  });
});

describe("buildMappingTable", () => {
  const catalog = buildCatalog([
    fixture,
    {
      ...fixture,
      supplier: { ...fixture.supplier, id: "b", name: "Supplier B" },
      sections: [{ ...fixture.sections[0], rows: [{ id: "b:elbow", text: "ELBOW", price: 1.5, unit: "EA" }] }],
    },
  ]);

  it("picks the cheaper supplier per base unit", () => {
    const [row] = buildMappingTable(
      [
        {
          id: "elbow",
          name: "Elbow",
          category: "elbows",
          baseUnit: "each",
          mappings: [
            { itemId: "a:elbow", unitsPerPurchase: 1, confidence: "high" },
            { itemId: "b:elbow", unitsPerPurchase: 1, confidence: "high" },
          ],
        },
      ],
      catalog,
    );
    expect(row.status).toBe("matched");
    expect(row.cheapestSupplier).toBe("b");
  });

  it("fails loudly on a mapping to a missing item", () => {
    expect(() =>
      buildMappingTable(
        [{ id: "x", name: "X", category: "other", baseUnit: "each", mappings: [{ itemId: "nope", unitsPerPurchase: 1, confidence: "high" }] }],
        catalog,
      ),
    ).toThrow(/missing item nope/);
  });

  it("flags unclear units for review", () => {
    const review = buildReview([fixture.supplier], buildCatalog([fixture]), []);
    expect(review.some((e) => e.kind === "unclear-unit")).toBe(true);
  });
});

describe("toCsv", () => {
  it("quotes commas and quotes", () => {
    expect(toCsv([['6" K, white', null]])).toBe('﻿"6"" K, white",\r\n');
  });
});

describe("real price list data", () => {
  const catalog = buildCatalog([spectra, townCountry]);

  it("maps every canonical item to an existing catalog item", () => {
    expect(() => buildMappingTable(canonicalItems, catalog)).not.toThrow();
  });

  it("puts every gutter item in the canonical layer", () => {
    const mapped = new Set(canonicalItems.flatMap((c) => c.mappings.map((m) => m.itemId)));
    const missing = catalog.filter((i) => i.gutterRelevant && !mapped.has(i.id)).map((i) => i.id);
    expect(missing).toEqual([]);
  });

  it("has unique canonical ids", () => {
    const ids = canonicalItems.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("compares downspouts per foot", () => {
    const row = buildMappingTable(canonicalItems, catalog).find((r) => r.canonicalId === "ds-3x4-10")!;
    expect(row.suppliers.spectra.best.perBaseUnit).toBe(1.6);
    expect(row.suppliers["town-country"].best.perBaseUnit).toBe(1.952);
    expect(row.cheapestSupplier).toBe("spectra");
  });
});
