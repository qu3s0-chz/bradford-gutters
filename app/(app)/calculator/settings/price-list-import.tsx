"use client";

import { useState } from "react";
import { toCsv } from "@/calculator/lib/build.ts";
import { parseCsv } from "@/calculator/lib/csv.ts";
import {
  diffPriceList,
  mergePriceList,
  priceListFromCsv,
  resolvePricingData,
  type PriceListDiff,
  type PricingItem,
} from "@/calculator/lib/data.ts";
import type { CalculatorSettings } from "@/calculator/lib/settings.ts";
import { Button, Section, SelectField, TextField } from "../fields";
import { basePricingData, downloadFile, formatMoney } from "../pricing-data";

interface Pending {
  supplierId: string;
  items: PricingItem[];
  diff: PriceListDiff;
  errors: string[];
}

const price = (value: number | null) => (value === null ? "call" : formatMoney(value));

function Preview({ title, lines }: { title: string; lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-sm font-medium">
        {title} ({lines.length})
      </p>
      <ul className="mt-1 list-disc pl-5 text-sm text-muted">
        {lines.slice(0, 20).map((line) => (
          <li key={line}>{line}</li>
        ))}
        {lines.length > 20 && <li>and {lines.length - 20} more</li>}
      </ul>
    </div>
  );
}

export function PriceListImport({
  settings,
  update,
}: {
  settings: CalculatorSettings;
  update: (change: (draft: CalculatorSettings) => void) => void;
}) {
  const [supplierId, setSupplierId] = useState(basePricingData.suppliers[0].id);
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [pending, setPending] = useState<Pending | null>(null);

  const current = () =>
    resolvePricingData(basePricingData, { ...settings, priceOverrides: {} }).items.filter(
      (item) => item.supplier === supplierId,
    );
  const mapped = new Set(
    resolvePricingData(basePricingData, settings).canonical.flatMap((c) => c.mappings.map((m) => m.itemId)),
  );

  const readFile = async (file: File) => {
    const { items, errors } = priceListFromCsv(parseCsv(await file.text()), supplierId);
    setPending({ supplierId, items, errors, diff: diffPriceList(current(), items) });
  };

  const exportCurrent = () =>
    downloadFile(
      `${supplierId}-price-list.csv`,
      toCsv([
        ["id", "supplier", "name", "sku", "unit", "unit_price", "carton_qty", "page"],
        ...current()
          .filter((item) => !item.discontinued)
          .map((i) => [i.id, i.supplier, i.name, i.sku, i.unit, i.unitPrice, i.cartonQty, i.page]),
      ]),
      "text/csv",
    );

  const removedMapped = pending?.diff.removed.filter((item) => mapped.has(item.id)) ?? [];

  return (
    <Section
      title="Update a price list"
      description="Download the current list, change prices in a spreadsheet, and upload it here. You'll see every change before it's applied. Scanned PDFs still need typing up first."
    >
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Supplier"
          value={supplierId}
          onChange={(value) => {
            setSupplierId(value);
            setPending(null);
          }}
          options={basePricingData.suppliers.map((s) => ({ value: s.id, label: s.name }))}
        />
        <TextField label="Prices as of" type="date" value={asOf} onChange={setAsOf} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={exportCurrent}>Download current list</Button>
        <label className="flex h-11 cursor-pointer items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium">
          Upload new list (CSV)
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
              event.target.value = "";
            }}
          />
        </label>
        {settings.priceLists[supplierId] && (
          <Button
            variant="danger"
            onClick={() =>
              update((d) => {
                delete d.priceLists[supplierId];
              })
            }
          >
            Go back to built-in list
          </Button>
        )}
      </div>

      {pending && (
        <div className="mt-4 rounded-lg border border-line p-3">
          {pending.errors.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-danger">
              {pending.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
          <p className="text-sm">
            {pending.items.length} items read. {pending.diff.unchanged} unchanged.
          </p>
          <Preview
            title="Price changes"
            lines={pending.diff.priceChanges.map((c) => `${c.name}: ${price(c.from)} to ${price(c.to)}`)}
          />
          <Preview title="New items, not matched to any product yet" lines={pending.diff.added.map((i) => i.name)} />
          <Preview
            title="Missing from the new list, kept as discontinued"
            lines={pending.diff.removed.map((i) => i.name)}
          />
          {removedMapped.length > 0 && (
            <p className="mt-3 text-sm text-danger">
              {removedMapped.length} missing item(s) are used in product matches. They&apos;ll show as not carried until
              you fix the match.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              onClick={() => {
                update((d) => {
                  d.priceLists[pending.supplierId] = { asOf, items: mergePriceList(current(), pending.items) };
                });
                setPending(null);
              }}
            >
              Apply update
            </Button>
            <Button onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </Section>
  );
}
