import type { PricingItem } from "./data.ts";
import type { Mapping } from "./types.ts";

export const gutterSizes = ["5", "6", "7"] as const;
export type GutterSize = (typeof gutterSizes)[number];

export const downspoutSizes = ["2x3", "3x4", "4x5"] as const;
export type DownspoutSize = (typeof downspoutSizes)[number];

export type MiterStyle = "box" | "strip" | "bay";

export interface CoilSetting {
  canonicalId: string;
  widthIn: number;
  gaugeIn: number;
}

export interface SupplierSettings {
  enabled: boolean;
  deliveryFee: number;
  minimumOrder: number;
  taxRatePct: number;
  /** Round every item up to whole cartons. */
  fullCartonsOnly: boolean;
}

export interface ImportedPriceList {
  asOf: string;
  items: PricingItem[];
}

export interface CalculatorSettings {
  version: 1;
  wastePct: number;
  markupPct: number;
  labor: { mode: "per-ft" | "flat"; rate: number };
  tearOff: { perFt: number; haulAwayFee: number };
  hangerSpacingIn: number;
  aluminumLbPerCubicIn: number;
  /** Used only to choose a cheapest mix: what one more pickup stop is worth. */
  extraStopCost: number;
  coil: Record<GutterSize, CoilSetting>;
  parts: {
    hanger: Record<GutterSize, string>;
    miterStyle: MiterStyle;
    elbowStyle: "a" | "b";
    downspoutPieceFt: number;
    sealant: string;
    zipScrew: string;
    rivet: string;
    hexScrew: string;
    strap: string;
  };
  ratios: {
    zipScrewsPerElbow: number;
    zipScrewsPerStrap: number;
    zipScrewsPerDownspoutSplice: number;
    rivetsPerOutlet: number;
    rivetsPerMiter: number;
    rivetsPerEndCap: number;
    hexScrewsPerHanger: number;
    sealantJointsPerTube: number;
    strapSpacingFt: number;
    minStrapsPerDownspout: number;
  };
  suppliers: Record<string, SupplierSettings>;
  /** Catalog item id to edited price. */
  priceOverrides: Record<string, number>;
  /** Canonical id to replacement mappings. */
  mappingOverrides: Record<string, Mapping[]>;
  /** Supplier id to an imported price list that replaces the built-in one. */
  priceLists: Record<string, ImportedPriceList>;
}

export const defaultSupplierSettings: SupplierSettings = {
  enabled: true,
  deliveryFee: 0,
  minimumOrder: 0,
  taxRatePct: 7,
  fullCartonsOnly: false,
};

// Every number below is a placeholder until confirmed against how the crew
// installs. CALCULATOR_BRAIN.md lists them for review.
export const defaultSettings: CalculatorSettings = {
  version: 1,
  wastePct: 10,
  markupPct: 30,
  labor: { mode: "per-ft", rate: 4 },
  tearOff: { perFt: 1, haulAwayFee: 75 },
  hangerSpacingIn: 24,
  aluminumLbPerCubicIn: 0.0975,
  extraStopCost: 15,
  coil: {
    "5": { canonicalId: "coil-027-11.875", widthIn: 11.875, gaugeIn: 0.027 },
    "6": { canonicalId: "coil-027-15", widthIn: 15, gaugeIn: 0.027 },
    "7": { canonicalId: "coil-032-17.875", widthIn: 17.875, gaugeIn: 0.032 },
  },
  parts: {
    hanger: {
      "5": "hanger-5-speed-screw",
      "6": "hanger-6-speed-screw",
      "7": "hanger-7-speed-screw",
    },
    miterStyle: "strip",
    elbowStyle: "a",
    downspoutPieceFt: 10,
    sealant: "sealant-npc-900",
    zipScrew: "screw-8x0.5",
    rivet: "pop-rivet",
    hexScrew: "screw-10x1.5",
    strap: "downspout-band",
  },
  ratios: {
    zipScrewsPerElbow: 4,
    zipScrewsPerStrap: 2,
    zipScrewsPerDownspoutSplice: 4,
    rivetsPerOutlet: 4,
    rivetsPerMiter: 6,
    rivetsPerEndCap: 3,
    hexScrewsPerHanger: 0,
    sealantJointsPerTube: 6,
    strapSpacingFt: 6,
    minStrapsPerDownspout: 2,
  },
  suppliers: {
    spectra: { ...defaultSupplierSettings },
    "town-country": { ...defaultSupplierSettings },
  },
  priceOverrides: {},
  mappingOverrides: {},
  priceLists: {},
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function merge<T>(defaults: T, saved: unknown): T {
  if (!isObject(defaults) || !isObject(saved)) {
    return saved === undefined || typeof saved !== typeof defaults ? defaults : (saved as T);
  }
  const result: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(saved)) {
    result[key] = key in defaults ? merge((defaults as Record<string, unknown>)[key], value) : value;
  }
  return result as T;
}

/** Fills anything missing from saved settings, such as fields added later. */
export function withDefaults(saved: unknown): CalculatorSettings {
  const settings = merge(defaultSettings, saved);
  for (const [id, supplier] of Object.entries(settings.suppliers)) {
    settings.suppliers[id] = merge(defaultSupplierSettings, supplier);
  }
  return settings;
}

export function supplierSettings(settings: CalculatorSettings, supplierId: string): SupplierSettings {
  return settings.suppliers[supplierId] ?? defaultSupplierSettings;
}
