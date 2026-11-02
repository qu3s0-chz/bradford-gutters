"use client";

import { useMemo, useState } from "react";
import { resolvePricingData } from "@/calculator/lib/data.ts";
import type { CalculatorSettings } from "@/calculator/lib/settings.ts";
import { NumberField, Section, SelectField, TextField } from "../fields";
import { basePricingData, formatMoney } from "../pricing-data";

export function PriceTable({
  settings,
  update,
}: {
  settings: CalculatorSettings;
  update: (change: (draft: CalculatorSettings) => void) => void;
}) {
  const [supplier, setSupplier] = useState(basePricingData.suppliers[0].id);
  const [filter, setFilter] = useState("");

  // Prices before edits, so each row can show what it was.
  const listed = useMemo(
    () => resolvePricingData(basePricingData, { ...settings, priceOverrides: {} }).items,
    [settings],
  );

  const rows = listed.filter(
    (item) =>
      item.supplier === supplier &&
      `${item.name} ${item.sku ?? ""}`.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const edited = Object.keys(settings.priceOverrides).length;

  return (
    <Section
      title="Prices"
      description={`Edits only change future calculations. ${edited} price${edited === 1 ? "" : "s"} edited.`}
    >
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Supplier"
          value={supplier}
          onChange={setSupplier}
          options={basePricingData.suppliers.map((s) => ({ value: s.id, label: s.name }))}
        />
        <TextField label="Search" value={filter} onChange={setFilter} />
      </div>
      <ul className="mt-4 divide-y divide-line">
        {rows.map((item) => {
          const override = settings.priceOverrides[item.id];
          return (
            <li key={item.id} className="flex items-end gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted">
                  {item.sku ? `${item.sku} · ` : ""}per {item.unit}
                  {item.page ? ` · page ${item.page}` : ""}
                  {item.discontinued ? " · not on latest list" : ""}
                </p>
                {override !== undefined && (
                  <button
                    type="button"
                    onClick={() => update((d) => { delete d.priceOverrides[item.id]; })}
                    className="mt-1 text-xs font-medium text-brand"
                  >
                    Reset to listed {item.unitPrice === null ? "call" : formatMoney(item.unitPrice)}
                  </button>
                )}
              </div>
              <div className="w-28 shrink-0">
                {item.unitPrice === null && override === undefined ? (
                  <button
                    type="button"
                    onClick={() => update((d) => { d.priceOverrides[item.id] = 0; })}
                    className="h-11 w-full rounded-lg border border-line text-sm text-muted"
                  >
                    Call: add price
                  </button>
                ) : (
                  <NumberField
                    label="Price"
                    suffix="$"
                    value={override ?? item.unitPrice ?? 0}
                    onChange={(value) =>
                      update((d) => {
                        if (value === item.unitPrice) delete d.priceOverrides[item.id];
                        else d.priceOverrides[item.id] = value;
                      })
                    }
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
