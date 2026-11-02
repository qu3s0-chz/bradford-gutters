"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { PricingData } from "@/calculator/lib/data.ts";
import { pricePerBaseUnit } from "@/calculator/lib/normalize.ts";
import type { CalculatorSettings } from "@/calculator/lib/settings.ts";
import type { Confidence, Mapping } from "@/calculator/lib/types.ts";
import { Button, NumberField, Section, SelectField } from "../fields";
import { basePricingData, formatMoney } from "../pricing-data";

export function MappingEditor({
  settings,
  data,
  update,
}: {
  settings: CalculatorSettings;
  data: PricingData;
  update: (change: (draft: CalculatorSettings) => void) => void;
}) {
  const [canonicalId, setCanonicalId] = useState(data.canonical[0].id);
  const canonical = data.canonical.find((c) => c.id === canonicalId) ?? data.canonical[0];
  const items = new Map(data.items.map((i) => [i.id, i]));
  const overridden = canonical.id in settings.mappingOverrides;

  const save = (mappings: Mapping[]) =>
    update((d) => {
      d.mappingOverrides[canonical.id] = mappings;
    });
  const change = (index: number, patch: Partial<Mapping>) =>
    save(canonical.mappings.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const itemOptions = (supplierId: string) =>
    data.items
      .filter((i) => i.supplier === supplierId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((i) => ({ value: i.id, label: `${i.name}${i.unitPrice === null ? " (call)" : ` · ${formatMoney(i.unitPrice)}`}` }));

  return (
    <Section
      title="Matches across suppliers"
      description="Each product the calculator uses points at one or more supplier items. Fix a bad match here."
    >
      <SelectField
        label="Product"
        value={canonical.id}
        onChange={setCanonicalId}
        options={data.canonical.map((c) => ({
          value: c.id,
          label: `${c.name}${c.id in settings.mappingOverrides ? " (edited)" : ""}`,
          group: c.category,
        }))}
      />
      <p className="mt-2 text-xs text-muted">Compared per {canonical.baseUnit}.</p>

      <ul className="mt-3 flex flex-col gap-3">
        {canonical.mappings.map((mapping, index) => {
          const item = items.get(mapping.itemId);
          const supplierId = item?.supplier ?? data.suppliers[0].id;
          const perUnit = item ? pricePerBaseUnit(item.unitPrice, mapping.unitsPerPurchase || 1) : null;
          return (
            <li key={`${mapping.itemId}-${index}`} className="rounded-lg border border-line p-3">
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Supplier"
                  value={supplierId}
                  onChange={(next) => change(index, { itemId: itemOptions(next)[0]?.value ?? mapping.itemId })}
                  options={data.suppliers.map((s) => ({ value: s.id, label: s.name }))}
                />
                <SelectField
                  label="Confidence"
                  value={mapping.confidence}
                  onChange={(value) => change(index, { confidence: value as Confidence })}
                  options={[
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                    { value: "low", label: "Low" },
                  ]}
                />
                <div className="col-span-2">
                  <SelectField
                    label="Item"
                    value={mapping.itemId}
                    onChange={(itemId) => change(index, { itemId })}
                    options={itemOptions(supplierId)}
                  />
                </div>
                <NumberField
                  label={`${canonical.baseUnit} per purchase`}
                  value={mapping.unitsPerPurchase}
                  onChange={(value) => value > 0 && change(index, { unitsPerPurchase: value })}
                />
                <div className="flex items-end justify-between gap-2">
                  <p className="pb-3 text-xs text-muted">
                    {perUnit === null ? "No price" : `${formatMoney(perUnit)} per ${canonical.baseUnit}`}
                  </p>
                  <button
                    type="button"
                    aria-label="Remove match"
                    onClick={() => save(canonical.mappings.filter((_, i) => i !== index))}
                    className="flex size-11 items-center justify-center rounded-lg border border-line text-muted"
                  >
                    <Trash2 aria-hidden size={18} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          onClick={() =>
            save([
              ...canonical.mappings,
              { itemId: itemOptions(data.suppliers[0].id)[0].value, unitsPerPurchase: 1, confidence: "medium" },
            ])
          }
        >
          Add supplier item
        </Button>
        {overridden && (
          <Button
            variant="danger"
            onClick={() =>
              update((d) => {
                delete d.mappingOverrides[canonical.id];
              })
            }
          >
            Reset to default
          </Button>
        )}
      </div>
      {overridden && (
        <p className="mt-2 text-xs text-muted">
          Default:{" "}
          {basePricingData.canonical
            .find((c) => c.id === canonical.id)
            ?.mappings.map((m) => m.itemId)
            .join(", ")}
        </p>
      )}
    </Section>
  );
}
