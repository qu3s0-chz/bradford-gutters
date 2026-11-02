"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { resolvePricingData } from "@/calculator/lib/data.ts";
import {
  defaultSettings,
  gutterSizes,
  supplierSettings,
  withDefaults,
  type CalculatorSettings,
  type MiterStyle,
} from "@/calculator/lib/settings.ts";
import type { Category } from "@/calculator/lib/types.ts";
import { Button, NumberField, Section, SelectField, Toggle } from "../fields";
import { basePricingData, downloadFile } from "../pricing-data";
import { settingsStore } from "../stores";
import { MappingEditor } from "./mapping-editor";
import { PriceListImport } from "./price-list-import";
import { PriceTable } from "./price-table";

const ratioFields: { key: keyof CalculatorSettings["ratios"]; label: string; suffix?: string }[] = [
  { key: "zipScrewsPerElbow", label: "Zip screws per elbow" },
  { key: "zipScrewsPerStrap", label: "Zip screws per strap" },
  { key: "zipScrewsPerDownspoutSplice", label: "Zip screws per downspout splice" },
  { key: "rivetsPerOutlet", label: "Rivets per outlet" },
  { key: "rivetsPerMiter", label: "Rivets per miter" },
  { key: "rivetsPerEndCap", label: "Rivets per end cap" },
  { key: "hexScrewsPerHanger", label: "Hex screws per hanger" },
  { key: "sealantJointsPerTube", label: "Sealed joints per tube" },
  { key: "strapSpacingFt", label: "Strap spacing", suffix: "ft" },
  { key: "minStrapsPerDownspout", label: "Minimum straps per downspout" },
];

/** Reads gauge and width from ids like "coil-027-15" or "coil-032-17.875". */
function coilFromId(id: string) {
  const match = /^coil-(\d{3})-([\d.]+)$/.exec(id);
  return match ? { gaugeIn: Number(`0.${match[1]}`), widthIn: Number(match[2]) } : null;
}

export function SettingsForm() {
  const settings = settingsStore.useValue();
  const data = useMemo(() => resolvePricingData(basePricingData, settings), [settings]);

  const update = (change: (draft: CalculatorSettings) => void) => {
    const draft = structuredClone(settings);
    change(draft);
    settingsStore.write(draft);
  };

  const options = (category: Category, prefix = "") =>
    data.canonical
      .filter((c) => c.category === category && c.id.startsWith(prefix))
      .map((c) => ({ value: c.id, label: c.name }));

  const importBackup = async (file: File) => {
    try {
      settingsStore.write(withDefaults(JSON.parse(await file.text())));
    } catch {
      window.alert("That file isn't a settings backup.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Link href="/calculator" className="flex items-center gap-1 text-sm font-medium text-brand">
        <ChevronLeft aria-hidden size={18} />
        Calculator
      </Link>
      <h1 className="text-2xl font-semibold">Calculator settings</h1>
      <p className="text-sm text-muted">
        Changes save on this device as you type. The starting numbers are placeholders until you confirm them.
      </p>

      <Section title="Quote">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Markup" suffix="%" value={settings.markupPct} onChange={(v) => update((d) => { d.markupPct = v; })} />
          <SelectField
            label="Labor charged"
            value={settings.labor.mode}
            onChange={(v) => update((d) => { d.labor.mode = v as "per-ft" | "flat"; })}
            options={[
              { value: "per-ft", label: "Per foot of gutter" },
              { value: "flat", label: "Flat per job" },
            ]}
          />
          <NumberField
            label={settings.labor.mode === "per-ft" ? "Labor per ft" : "Labor per job"}
            suffix="$"
            value={settings.labor.rate}
            onChange={(v) => update((d) => { d.labor.rate = v; })}
          />
          <NumberField label="Tear-off per ft" suffix="$" value={settings.tearOff.perFt} onChange={(v) => update((d) => { d.tearOff.perFt = v; })} />
          <NumberField label="Haul-away fee" suffix="$" value={settings.tearOff.haulAwayFee} onChange={(v) => update((d) => { d.tearOff.haulAwayFee = v; })} />
        </div>
      </Section>

      <Section title="Materials math">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Waste factor" suffix="%" value={settings.wastePct} onChange={(v) => update((d) => { d.wastePct = v; })} />
          <NumberField label="Hanger spacing" suffix="in" value={settings.hangerSpacingIn} onChange={(v) => update((d) => { d.hangerSpacingIn = v; })} />
          <NumberField
            label="Aluminum weight"
            suffix="lb/in³"
            value={settings.aluminumLbPerCubicIn}
            onChange={(v) => update((d) => { d.aluminumLbPerCubicIn = v; })}
          />
          <NumberField
            label="Cost of an extra pickup stop"
            suffix="$"
            value={settings.extraStopCost}
            onChange={(v) => update((d) => { d.extraStopCost = v; })}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Waste applies to coil and guards. The extra stop cost only steers Cheapest mix toward fewer suppliers; it&apos;s never added to a total.
        </p>
      </Section>

      <Section title="Coil by gutter size" description="Coil weight per foot is width × 12 in × gauge × aluminum weight.">
        <div className="flex flex-col gap-4">
          {gutterSizes.map((size) => (
            <div key={size} className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <SelectField
                  label={`${size}" gutter coil`}
                  value={settings.coil[size].canonicalId}
                  onChange={(id) =>
                    update((d) => {
                      d.coil[size] = { ...d.coil[size], canonicalId: id, ...coilFromId(id) };
                    })
                  }
                  options={options("gutter-coil-stock", "coil-")}
                />
              </div>
              <NumberField label="Width" suffix="in" value={settings.coil[size].widthIn} onChange={(v) => update((d) => { d.coil[size].widthIn = v; })} />
              <NumberField label="Gauge" suffix="in" value={settings.coil[size].gaugeIn} onChange={(v) => update((d) => { d.coil[size].gaugeIn = v; })} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Parts">
        <div className="grid grid-cols-2 gap-3">
          {gutterSizes.map((size) => (
            <SelectField
              key={size}
              label={`${size}" hanger`}
              value={settings.parts.hanger[size]}
              onChange={(v) => update((d) => { d.parts.hanger[size] = v; })}
              options={options("hangers", `hanger-${size}-`)}
            />
          ))}
          <SelectField
            label="Miter style"
            value={settings.parts.miterStyle}
            onChange={(v) => update((d) => { d.parts.miterStyle = v as MiterStyle; })}
            options={[
              { value: "strip", label: "Strip" },
              { value: "box", label: "Box" },
              { value: "bay", label: "Bay strip" },
            ]}
          />
          <SelectField
            label="Elbow style"
            value={settings.parts.elbowStyle}
            onChange={(v) => update((d) => { d.parts.elbowStyle = v as "a" | "b"; })}
            options={[
              { value: "a", label: "A style" },
              { value: "b", label: "B style" },
            ]}
          />
          <SelectField
            label="Downspout piece length"
            value={String(settings.parts.downspoutPieceFt)}
            onChange={(v) => update((d) => { d.parts.downspoutPieceFt = Number(v); })}
            options={[
              { value: "10", label: "10 ft" },
              { value: "8", label: "8 ft" },
            ]}
          />
          <SelectField label="Sealant" value={settings.parts.sealant} onChange={(v) => update((d) => { d.parts.sealant = v; })} options={options("sealant")} />
          <SelectField label="Zip screw" value={settings.parts.zipScrew} onChange={(v) => update((d) => { d.parts.zipScrew = v; })} options={options("fasteners")} />
          <SelectField label="Rivet" value={settings.parts.rivet} onChange={(v) => update((d) => { d.parts.rivet = v; })} options={options("fasteners")} />
          <SelectField label="Hanger screw" value={settings.parts.hexScrew} onChange={(v) => update((d) => { d.parts.hexScrew = v; })} options={options("fasteners")} />
          <SelectField label="Downspout strap" value={settings.parts.strap} onChange={(v) => update((d) => { d.parts.strap = v; })} options={options("straps")} />
        </div>
      </Section>

      <Section title="Ratios">
        <div className="grid grid-cols-2 gap-3">
          {ratioFields.map(({ key, label, suffix }) => (
            <NumberField
              key={key}
              label={label}
              suffix={suffix}
              value={settings.ratios[key]}
              onChange={(v) => update((d) => { d.ratios[key] = v; })}
            />
          ))}
        </div>
      </Section>

      <Section title="Suppliers">
        <div className="flex flex-col gap-5">
          {data.suppliers.map((supplier) => {
            const s = supplierSettings(settings, supplier.id);
            const set = (change: (draft: typeof s) => void) =>
              update((d) => {
                const next = { ...s };
                change(next);
                d.suppliers[supplier.id] = next;
              });
            return (
              <div key={supplier.id}>
                <p className="font-medium">{supplier.name}</p>
                <p className="text-xs text-muted">Prices as of {supplier.asOf}</p>
                <Toggle label="Use this supplier" checked={s.enabled} onChange={(v) => set((x) => { x.enabled = v; })} />
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Delivery fee" suffix="$" value={s.deliveryFee} onChange={(v) => set((x) => { x.deliveryFee = v; })} />
                  <NumberField label="Minimum order" suffix="$" value={s.minimumOrder} onChange={(v) => set((x) => { x.minimumOrder = v; })} />
                  <NumberField label="Sales tax" suffix="%" value={s.taxRatePct} onChange={(v) => set((x) => { x.taxRatePct = v; })} />
                </div>
                <Toggle
                  label="Full cartons only"
                  checked={s.fullCartonsOnly}
                  onChange={(v) => set((x) => { x.fullCartonsOnly = v; })}
                />
              </div>
            );
          })}
        </div>
      </Section>

      <PriceTable settings={settings} update={update} />
      <MappingEditor settings={settings} data={data} update={update} />
      <PriceListImport settings={settings} update={update} />

      <Section title="Backup" description="Settings live in this browser. Export a backup before clearing it or switching phones.">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              downloadFile(
                `calculator-settings-${new Date().toISOString().slice(0, 10)}.json`,
                JSON.stringify(settings, null, 2),
                "application/json",
              )
            }
          >
            Export settings
          </Button>
          <label className="flex h-11 cursor-pointer items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium">
            Import settings
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importBackup(file);
                event.target.value = "";
              }}
            />
          </label>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("Reset every calculator setting, price edit and mapping edit?")) {
                settingsStore.write(defaultSettings);
              }
            }}
          >
            Reset everything
          </Button>
        </div>
      </Section>
    </div>
  );
}
