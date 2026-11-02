# Material calculator brain

Running notes for the Bradford Seamless Gutters material calculator. Update this file whenever a decision, the data model, a mapping, or an open question changes.

## Status

- **Phase 1, price list parsing:** done and waiting for owner review. Nothing in Phase 2 should start until the review answers come back.
- **Phase 2, calculator and supplier comparison:** not started.

## What it is

A standalone material calculator. It takes job measurements, lists materials with costs, and compares suppliers. It lives in `calculator/` inside the Bradford V2 repo so it shares the stack (Next.js, TypeScript, Supabase later). Nothing in `calculator/lib` or `calculator/data` imports from the app, so the folder can be lifted out or wired into V2 quotes later.

## Layout

| Path | Contents |
|---|---|
| `price-lists/` | Copies of the supplier PDFs, renamed by supplier and scan date |
| `data/transcriptions/` | One file per supplier with every printed line, transcribed by hand |
| `data/canonical.ts` | Canonical items and their supplier mappings |
| `lib/` | Pure functions: unit normalization, catalog, mapping table, review list, CSV |
| `scripts/build-catalog.ts` | Writes everything in `output/` |
| `output/` | Generated files; never edit these by hand |
| `tests/` | Vitest tests, including checks against the real data |

Commands, run from the repo root on Windows:

- `npm.cmd run catalog` rebuilds `output/`.
- `npm.cmd test` runs the tests.

## Data flow

1. **Transcribe:** a transcription file holds each line as printed: text, price, printed unit, page and section. Anything read from it by hand, such as size, color, gauge or pack size, sits next to it. So do notes and review flags.
2. **Build the catalog:** `buildCatalog` normalizes each line into a `CatalogItem`.
3. **Map:** `canonicalItems` map each product to one or more catalog ids, with `unitsPerPurchase` converting each one to a base unit.
4. **Compare:** `buildMappingTable` prices each canonical item per base unit for every supplier and picks the cheapest.
5. **Review:** `buildReview` collects everything a person needs to confirm.

## Data model

**CatalogItem fields:** `id`, `supplier`, `category`, `name`, `sku`, `size`, `color`, `gauge`, `unit`, `unitAsPrinted`, `packQty`, `cartonQty`, `unitPrice`, `priceStatus`, `sourceFile`, `page`, `section`, `priceListDate`, `asOf`, `rawText`, `gutterRelevant`, `notes`, `review`.

- **`unit`:** one of each, per-ft, per-lb, bag, box, tube, can, roll, case or unclear. Unknown printed units become `unclear` instead of being guessed.
- **`packQty`:** pieces, feet or pounds covered by one priced unit. Examples are 100 for a bag of 100, or 10 for a 10 ft downspout.
- **`cartonQty`:** the supplier's "Qty Per" carton count. This is separate from the priced unit. Spectra prices most items per piece and prints a carton count beside it.
- **`priceStatus`:** `listed`, `handwritten` or `call`. Call items have a null price and are never treated as $0.

**CanonicalItem:** `id`, `name`, `category`, `baseUnit`, and `mappings[]`. The base unit is each, ft or lb.

**Mapping:** `itemId`, `unitsPerPurchase`, `confidence`, and optional `alternate` and `note`.

- **Confidence:** `high`, `medium` or `low`.
- **Alternate:** marks a second SKU from the same supplier, such as a spin-down coil or a 1000-count box.

**Categories:** gutter-coil-stock, downspouts, elbows, miters, end-caps, outlets, hangers, fasteners, sealant, straps, gutter-guards, accessories, other.

## Decisions

- **Hand transcription:** both PDFs are scans with no text layer, and no OCR tool is installed. Transcriptions keep the printed text, including truncated descriptions, so every number can be checked against the page.
- **Stable ids:** Spectra items use their printed code, such as `spectra:4DP10`. Town & Country prints no SKUs, so its items use a slug of the description, such as `town-country:alum-3-x4-10-downspout-frost`. Rows the canonical layer uses get a short explicit id instead. Repeated descriptions get `-2`.
- **Shared-price rows:** some Spectra rows cover several SKUs at one price, such as coil widths and gauges, A and B elbows, inside and outside miters. These are split into one catalog item per SKU, and each one keeps the original row text.
- **Coil SKUs:** Spectra coil SKUs are built from the printed code pattern `(027,032)11,11875,15__` and need confirming.
- **Handwritten changes:** handwritten prices and carton quantities on the Spectra sheet are used over printed ones and flagged.
- **Price dates:** neither list prints a date, so `priceListDate` is null and `asOf` is the scan date.
- **Canonical scope:** the canonical layer covers gutter products only. The other roughly 340 Town & Country items, such as patio, screen, siding and windows, stay in the catalog as `other` or their real category, with no canonical item.
- **Per-unit comparisons:** downspouts and guards with a printed length compare per foot. Coil compares per pound, fasteners per piece, everything else per item.
- **Trim coil:** compared per roll, because Town & Country doesn't print a roll length.
- **Pack sizes:** guessed pack sizes only appear in mappings with low confidence and a note. They never sit silently in the catalog.
- **Skipped lines:** the two "CALL FOR PRICING" lines under windows and special order items are headings, not products, so they are left out.
- **Readability:** every line on both scans was readable. On Town & Country pages 2 to 5, a dark streak across the top left only covers part of the page header.

## Canonical mapping notes

- **Coverage:** 22 products are carried by both suppliers. Spectra is cheaper on 21 of them, often by 30% to 50%. Town & Country is cheaper on #8 x 1/2" screws when bought by the 1000-count box.
- **Town & Country rain carrying:** this section only covers 6" gutter in frost, plus 4x5 downspout parts. There is no 5" gutter, 2x3 downspout, outside miter or right end cap.
- **Coil:** Town & Country's .032 coil is 18" wide, mapped to Spectra's 17-7/8" with low confidence.
- **Hangers:** the Town & Country Hang Fast with screw is mapped to the Spectra 6" speed screw hanger with medium confidence. The Town & Country hook hanger has no Spectra match.
- **Sealant:** NPC #900 and #400 match high. OSI GS121 vs OSI SBR 100 is low, because they may be different products. Geocel 2320 (Spectra) and Geocel 2300 (Town & Country) are kept separate.

## Open questions

The full list with item ids is in `output/needs-review.md`. These change the calculator most:

1. **Cartons:** can you buy loose pieces from Spectra, or only full cartons? This decides rounding.
2. **Coil widths:** which coil width and gauge do you run for 5" and 6" K-style, and for 7" if you do it?
3. **Hangers:** which hanger do you actually install, and at what spacing?
4. **Downspout gauge:** is Town & Country's downspout the same gauge as Spectra's .019?
5. **Fastener packs:** are Spectra zip screws and pop rivets priced per bag of 100?
6. **Delivery and tax:** what are each supplier's delivery fee, minimum order and tax treatment? These are needed for the Phase 2 comparison.
7. **Colors:** what colors do you stock? Town & Country's 6" parts are frost only.
8. **Updated lists:** how will new price lists arrive? Scans need reading by hand or with an extraction step. The plan is to extract a new list into a fresh transcription, then diff it by id against the old one and flag new and missing items for review.

## Phase 2 notes

- **Pricing logic:** pricing reads `output/canonical.json` and `output/catalog.json`, or the same data from Supabase once V2 has a database. Mappings reference catalog ids, so a new price list only replaces the catalog rows.
- **Placeholder defaults:** hanger spacing, ratios and waste factor will start as placeholders and be listed for the owner and partner to confirm.
