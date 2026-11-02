export const categories = [
  "gutter-coil-stock",
  "downspouts",
  "elbows",
  "miters",
  "end-caps",
  "outlets",
  "hangers",
  "fasteners",
  "sealant",
  "straps",
  "gutter-guards",
  "accessories",
  "other",
] as const;

export type Category = (typeof categories)[number];

// "unclear" keeps the printed unit visible instead of guessing.
export type Unit =
  | "each"
  | "per-ft"
  | "per-lb"
  | "bag"
  | "box"
  | "tube"
  | "can"
  | "roll"
  | "case"
  | "unclear";

export type BaseUnit = "each" | "ft" | "lb";

export type PriceStatus = "listed" | "call" | "handwritten";

export type Confidence = "high" | "medium" | "low";

export interface Supplier {
  id: string;
  name: string;
  account: string | null;
  sourceFile: string;
  pages: number;
  /** Date printed on the list. Neither current list prints one. */
  priceListDate: string | null;
  /** Date we can vouch for, currently the scan date. */
  asOf: string;
  notes: string[];
}

/** One line as printed on a price list, plus anything read from it by hand. */
export interface TranscribedRow {
  /** Stable id for rows the canonical layer references. Others get a slug. */
  id?: string;
  text: string;
  price: number | null;
  /** Unit exactly as printed, such as "EA", "LF" or "Pound". */
  unit: string;
  name?: string;
  sku?: string;
  category?: Category;
  size?: string;
  color?: string;
  gauge?: string;
  /** Pieces, feet or pounds covered by one priced unit, when known. */
  packQty?: number;
  /** Supplier carton quantity ("Qty Per"), separate from the priced unit. */
  cartonQty?: number;
  priceStatus?: PriceStatus;
  gutter?: boolean;
  notes?: string[];
  review?: string[];
}

export interface TranscribedSection {
  page: number;
  section: string;
  category: Category;
  gutter: boolean;
  rows: TranscribedRow[];
}

export interface Transcription {
  supplier: Supplier;
  sections: TranscribedSection[];
}

export interface CatalogItem {
  id: string;
  supplier: string;
  category: Category;
  name: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  gauge: string | null;
  unit: Unit;
  unitAsPrinted: string;
  packQty: number | null;
  cartonQty: number | null;
  unitPrice: number | null;
  priceStatus: PriceStatus;
  sourceFile: string;
  page: number;
  section: string;
  priceListDate: string | null;
  asOf: string;
  rawText: string;
  gutterRelevant: boolean;
  notes: string[];
  review: string[];
}

export interface Mapping {
  itemId: string;
  /** Base units in one priced unit: 10 for a 10 ft downspout, 100 for a bag of 100. */
  unitsPerPurchase: number;
  confidence: Confidence;
  /** A second SKU from the same supplier, such as a spin-down coil. */
  alternate?: boolean;
  note?: string;
}

export interface CanonicalItem {
  id: string;
  name: string;
  category: Category;
  baseUnit: BaseUnit;
  mappings: Mapping[];
}

export type ReviewKind =
  | "missing-price"
  | "unclear-unit"
  | "match"
  | "handwritten"
  | "unreadable"
  | "pack-size"
  | "data";

export interface ReviewEntry {
  kind: ReviewKind;
  supplier: string | null;
  itemIds: string[];
  canonicalId: string | null;
  message: string;
}
