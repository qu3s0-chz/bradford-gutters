import { describe, expect, it } from "vitest";
import { canonicalItems } from "../data/canonical.ts";
import { spectra } from "../data/transcriptions/spectra.ts";
import { townCountry } from "../data/transcriptions/town-country.ts";
import { buildCatalog } from "../lib/build.ts";
import { calculateNeeds, coilLbPerFt, hangersForRun, type JobInput } from "../lib/calculate.ts";
import { parseCsv } from "../lib/csv.ts";
import {
  diffPriceList,
  mergePriceList,
  priceListFromCsv,
  resolvePricingData,
  type PricingData,
  type PricingItem,
} from "../lib/data.ts";
import { compareSuppliers, priceForSupplier, suggestQuote } from "../lib/pricing.ts";
import {
  defaultSettings,
  defaultSupplierSettings,
  withDefaults,
  type CalculatorSettings,
} from "../lib/settings.ts";

const catalog = buildCatalog([spectra, townCountry]);
const realData: PricingData = {
  suppliers: [spectra.supplier, townCountry.supplier].map(({ id, name, asOf, priceListDate }) => ({
    id,
    name,
    asOf,
    priceListDate,
  })),
  items: catalog
    .filter((i) => i.gutterRelevant)
    .map(({ id, supplier, name, sku, unit, unitPrice, priceStatus, cartonQty, page }) => ({
      id, supplier, name, sku, unit, unitPrice, priceStatus, cartonQty, page,
    })),
  canonical: canonicalItems,
};
const available = new Set(canonicalItems.map((c) => c.id));

const job: JobInput = {
  gutterSize: "6",
  downspoutSize: "3x4",
  color: "White",
  guardId: null,
  tearOff: false,
  runs: [
    {
      id: "r1",
      label: "Front",
      lengthFt: 40,
      insideMiters: 1,
      outsideMiters: 1,
      endCaps: 2,
      downspouts: 2,
      downspoutHeightFt: 12,
      elbowsPerDownspout: 3,
    },
  ],
};

const quantities = (input: JobInput, settings = defaultSettings) =>
  Object.fromEntries(
    calculateNeeds(input, settings, available).needs.map((n) => [n.canonicalId, n.quantity]),
  );

describe("calculateNeeds", () => {
  it("derives every material for a single run", () => {
    expect(quantities(job)).toEqual({
      // 40 ft + 10% waste = 44 ft at 15 x 12 x .027 x .0975 = 0.47385 lb/ft = 20.85 lb
      "coil-027-15": 21,
      // 480 in / 24 in spacing
      "hanger-6-speed-screw": 20,
      "endcap-6": 2,
      "miter-6-strip-inside": 1,
      "miter-6-strip-outside": 1,
      // 2 downspouts x 2 ten-foot pieces each for 12 ft
      "ds-3x4-10": 40,
      "elbow-3x4-a": 6,
      "outlet-3x4": 2,
      // max(2 minimum, 12 ft / 6 ft) per downspout
      "downspout-band": 4,
      // 6 elbows x 4 + 4 straps x 2 + 2 splices x 4
      "screw-8x0.5": 40,
      // 2 outlets x 4 + 2 miters x 6 + 2 end caps x 3
      "pop-rivet": 26,
      // 6 joints / 6 per tube
      "sealant-npc-900": 1,
    });
  });

  it("adds runs together and skips empty ones", () => {
    const twoRuns: JobInput = {
      ...job,
      runs: [
        job.runs[0],
        { ...job.runs[0], id: "r2", lengthFt: 25, insideMiters: 0, outsideMiters: 0, downspouts: 0 },
        { ...job.runs[0], id: "r3", lengthFt: 0, insideMiters: 0, outsideMiters: 0, endCaps: 0, downspouts: 0 },
      ],
    };
    const q = quantities(twoRuns);
    expect(q["hanger-6-speed-screw"]).toBe(20 + 13);
    expect(q["endcap-6"]).toBe(4);
  });

  it("applies the waste factor to coil and guards", () => {
    const settings: CalculatorSettings = { ...defaultSettings, wastePct: 0 };
    const q = quantities({ ...job, guardId: "guard-6-ls-screen" }, settings);
    expect(q["coil-027-15"]).toBe(Math.ceil(40 * 0.47385));
    expect(q["guard-6-ls-screen"]).toBe(40);
  });

  it("falls back to a listed downspout length and warns", () => {
    const settings = { ...defaultSettings, parts: { ...defaultSettings.parts, downspoutPieceFt: 8 } };
    const result = calculateNeeds({ ...job, downspoutSize: "4x5" }, settings, available);
    expect(result.needs.find((n) => n.canonicalId === "ds-4x5-10")?.quantity).toBe(40);
    expect(result.warnings.join(" ")).toMatch(/No 8 ft 4x5 downspout/);
  });

  it("warns about parts missing from the price lists", () => {
    const result = calculateNeeds(
      { ...job, gutterSize: "7" },
      { ...defaultSettings, parts: { ...defaultSettings.parts, miterStyle: "box" } },
      available,
    );
    expect(result.warnings.join(" ")).toMatch(/miter-7-box-inside/);
  });

  it("ignores negative and blank numbers", () => {
    const q = quantities({ ...job, runs: [{ ...job.runs[0], endCaps: -3, downspouts: Number.NaN }] });
    expect(q["endcap-6"]).toBeUndefined();
    expect(q["outlet-3x4"]).toBeUndefined();
  });
});

describe("helpers", () => {
  it("computes coil weight per foot", () => {
    expect(coilLbPerFt({ canonicalId: "x", widthIn: 15, gaugeIn: 0.027 }, 0.0975)).toBeCloseTo(0.47385, 5);
  });

  it("rounds hangers up", () => {
    expect(hangersForRun(41, 24)).toBe(21);
    expect(hangersForRun(0, 24)).toBe(0);
  });
});

describe("priceForSupplier with real lists", () => {
  const items = new Map(realData.items.map((i) => [i.id, i]));
  const byId = new Map(canonicalItems.map((c) => [c.id, c]));
  const price = (canonicalId: string, quantity: number, supplier: string, fullCartonsOnly = false) =>
    priceForSupplier(
      { canonicalId, quantity, basis: "" },
      byId.get(canonicalId),
      supplier,
      items,
      { ...defaultSupplierSettings, fullCartonsOnly },
    );

  it("buys whole downspout pieces", () => {
    expect(price("ds-3x4-10", 40, "spectra")).toMatchObject({ purchaseQty: 4, total: 64 });
    expect(price("ds-3x4-10", 40, "town-country")).toMatchObject({ purchaseQty: 4, total: 78.08 });
  });

  it("picks the cheapest pack for the quantity needed", () => {
    // 40 screws: a bag of 100 at $7.45 beats a box of 1000 at $21.17.
    expect(price("screw-8x0.5", 40, "town-country")).toMatchObject({ purchaseQty: 1, total: 7.45 });
    // 1500 screws: two boxes of 1000 ($42.34) beat 15 bags ($111.75).
    expect(price("screw-8x0.5", 1500, "town-country")).toMatchObject({
      itemId: "town-country:screw-8x1-2-sms-1000",
      total: 42.34,
    });
  });

  it("rounds to full cartons when required", () => {
    expect(price("endcap-6", 2, "spectra", true)).toMatchObject({ purchaseQty: 50, total: 60 });
  });

  it("says when a supplier doesn't carry an item", () => {
    expect(price("endcap-5", 2, "town-country")).toEqual({ status: "not-carried" });
  });
});

describe("compareSuppliers", () => {
  const data: PricingData = {
    suppliers: [
      { id: "a", name: "A", asOf: "2026-11-01", priceListDate: null },
      { id: "b", name: "B", asOf: "2026-11-01", priceListDate: null },
    ],
    items: [
      { id: "a:x", supplier: "a", name: "X", sku: null, unit: "each", unitPrice: 10, priceStatus: "listed", cartonQty: null, page: 1 },
      { id: "a:y", supplier: "a", name: "Y", sku: null, unit: "each", unitPrice: 10, priceStatus: "listed", cartonQty: null, page: 1 },
      { id: "b:x", supplier: "b", name: "X", sku: null, unit: "each", unitPrice: 5, priceStatus: "listed", cartonQty: null, page: 1 },
      { id: "b:z", supplier: "b", name: "Z", sku: null, unit: "each", unitPrice: null, priceStatus: "call", cartonQty: null, page: 1 },
    ],
    canonical: [
      { id: "x", name: "X", category: "other", baseUnit: "each", mappings: [{ itemId: "a:x", unitsPerPurchase: 1, confidence: "high" }, { itemId: "b:x", unitsPerPurchase: 1, confidence: "high" }] },
      { id: "y", name: "Y", category: "other", baseUnit: "each", mappings: [{ itemId: "a:y", unitsPerPurchase: 1, confidence: "high" }] },
      { id: "z", name: "Z", category: "other", baseUnit: "each", mappings: [{ itemId: "b:z", unitsPerPurchase: 1, confidence: "high" }] },
    ],
  };
  const needs = [
    { canonicalId: "x", quantity: 1, basis: "" },
    { canonicalId: "y", quantity: 1, basis: "" },
  ];
  const settingsWith = (overrides: Partial<CalculatorSettings>, b: Partial<typeof defaultSupplierSettings> = {}) => ({
    ...defaultSettings,
    extraStopCost: 0,
    suppliers: {
      a: { ...defaultSupplierSettings, taxRatePct: 0 },
      b: { ...defaultSupplierSettings, taxRatePct: 0, ...b },
    },
    ...overrides,
  });

  it("highlights the cheapest supplier per line and flags gaps", () => {
    const result = compareSuppliers(needs, data, settingsWith({}));
    expect(result.lines[0].cheapest).toBe("b");
    expect(result.lines[1].bySupplier.b).toEqual({ status: "not-carried" });
    expect(result.totals.b.missing).toEqual(["y"]);
    expect(result.bestSingle?.supplierId).toBe("a");
  });

  it("mixes suppliers and reports the savings", () => {
    const { mix } = compareSuppliers(needs, data, settingsWith({}));
    expect(mix.picks).toEqual({ x: "b", y: "a" });
    expect(mix.total).toBe(15);
    expect(mix.suppliers).toHaveLength(2);
    expect(mix.savingsVsBestSingle).toBe(5);
  });

  it("prefers fewer stops when the saving is small", () => {
    const { mix } = compareSuppliers(needs, data, settingsWith({ extraStopCost: 10 }));
    expect(mix.suppliers).toEqual(["a"]);
    expect(mix.total).toBe(20);
  });

  it("includes delivery fees in the mix decision", () => {
    const { mix } = compareSuppliers(needs, data, settingsWith({}, { deliveryFee: 6 }));
    expect(mix.suppliers).toEqual(["a"]);
  });

  it("adds tax and checks minimum orders", () => {
    const settings = settingsWith({});
    settings.suppliers.a = { ...settings.suppliers.a, taxRatePct: 7, minimumOrder: 50 };
    const { totals } = compareSuppliers(needs, data, settings);
    expect(totals.a).toMatchObject({ subtotal: 20, tax: 1.4, total: 21.4, belowMinimum: true });
  });

  it("never prices a call-for-price item as $0", () => {
    const result = compareSuppliers([{ canonicalId: "z", quantity: 1, basis: "" }], data, settingsWith({}));
    expect(result.lines[0].bySupplier.b.status).toBe("no-price");
    expect(result.lines[0].cheapest).toBeNull();
    expect(result.mix.missing).toEqual(["z"]);
  });

  it("skips disabled suppliers", () => {
    const result = compareSuppliers(needs, data, settingsWith({}, { enabled: false }));
    expect(result.suppliers).toEqual(["a"]);
  });
});

describe("suggestQuote", () => {
  it("adds markup, labor and tear-off", () => {
    expect(suggestQuote(100, { ...job, tearOff: true }, 40, defaultSettings)).toEqual({
      materials: 100,
      markup: 30,
      labor: 160,
      tearOff: 115,
      price: 405,
      grossProfit: 305,
      marginPct: 75.3,
    });
  });

  it("supports flat labor", () => {
    const settings = { ...defaultSettings, labor: { mode: "flat" as const, rate: 500 } };
    expect(suggestQuote(100, job, 40, settings).labor).toBe(500);
  });
});

describe("price data", () => {
  const items: PricingItem[] = [
    { id: "s:a", supplier: "s", name: "A", sku: null, unit: "each", unitPrice: 1, priceStatus: "listed", cartonQty: null, page: 1 },
    { id: "s:b", supplier: "s", name: "B", sku: null, unit: "each", unitPrice: 2, priceStatus: "listed", cartonQty: null, page: 1 },
  ];

  it("applies price overrides", () => {
    const resolved = resolvePricingData(realData, { ...defaultSettings, priceOverrides: { "spectra:4DP10": 17 } });
    expect(resolved.items.find((i) => i.id === "spectra:4DP10")).toMatchObject({ unitPrice: 17, overridden: true });
  });

  it("diffs a new list and keeps dropped items as discontinued", () => {
    const incoming: PricingItem[] = [{ ...items[0], unitPrice: 1.5 }, { ...items[0], id: "s:c", name: "C" }];
    expect(diffPriceList(items, incoming)).toMatchObject({
      priceChanges: [{ id: "s:a", from: 1, to: 1.5 }],
      added: [{ id: "s:c" }],
      removed: [{ id: "s:b" }],
      unchanged: 0,
    });
    expect(mergePriceList(items, incoming).find((i) => i.id === "s:b")?.discontinued).toBe(true);
  });

  it("reads a price list CSV", () => {
    const csv = 'id,supplier,name,unit,unit_price,carton_qty,gutter_relevant\r\ns:a,s,"A, white",each,$1.25,50,true\r\ns:x,other,X,each,1,,true\r\ns:p,s,Patio,each,9,,false\r\n,s,New Thing,each,call,,\r\ns:bad,s,Bad,each,abc,,\r\n';
    const { items: parsed, errors } = priceListFromCsv(parseCsv(csv), "s");
    expect(parsed.map((i) => [i.id, i.unitPrice, i.cartonQty])).toEqual([
      ["s:a", 1.25, 50],
      ["s:new-thing", null, null],
    ]);
    expect(errors).toEqual(['Line 6: "abc" is not a price.']);
  });
});

describe("parseCsv", () => {
  it("handles quotes, commas and a byte order mark", () => {
    expect(parseCsv('﻿a,"b, ""c"""\r\n1,2')).toEqual([["a", 'b, "c"'], ["1", "2"]]);
  });
});

describe("withDefaults", () => {
  it("fills in missing settings", () => {
    const settings = withDefaults({ wastePct: 5, suppliers: { spectra: { deliveryFee: 25 } } });
    expect(settings.wastePct).toBe(5);
    expect(settings.markupPct).toBe(30);
    expect(settings.suppliers.spectra).toMatchObject({ deliveryFee: 25, taxRatePct: 7 });
    expect(settings.suppliers["town-country"].enabled).toBe(true);
  });

  it("ignores garbage", () => {
    expect(withDefaults("nope")).toEqual(defaultSettings);
    expect(withDefaults({ wastePct: "ten" }).wastePct).toBe(10);
  });
});
