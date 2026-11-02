"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Settings, Trash2 } from "lucide-react";
import { toCsv } from "@/calculator/lib/build.ts";
import { calculateNeeds, type JobInput, type Run } from "@/calculator/lib/calculate.ts";
import { resolvePricingData } from "@/calculator/lib/data.ts";
import { compareSuppliers, suggestQuote, type SupplierLine } from "@/calculator/lib/pricing.ts";
import { downspoutSizes, gutterSizes, type DownspoutSize, type GutterSize } from "@/calculator/lib/settings.ts";
import { Button, NumberField, Section, SelectField, TextField, Toggle } from "./fields";
import { basePricingData, downloadFile, shortName } from "./pricing-data";
import { PriceDates, QuotePanel, Results, type Mode } from "./results";
import { defaultJob, jobStore, newRun, settingsStore } from "./stores";

const runFields: { key: keyof Omit<Run, "id" | "label">; label: string; suffix?: string }[] = [
  { key: "lengthFt", label: "Length", suffix: "ft" },
  { key: "endCaps", label: "End caps" },
  { key: "insideMiters", label: "Inside miters" },
  { key: "outsideMiters", label: "Outside miters" },
  { key: "downspouts", label: "Downspouts" },
  { key: "downspoutHeightFt", label: "Downspout height", suffix: "ft" },
  { key: "elbowsPerDownspout", label: "Elbows per downspout" },
];

function lineCells(line: SupplierLine | undefined) {
  if (!line || line.status === "not-carried") return ["not carried", "", "", ""];
  if (line.status === "no-price") return [line.itemName, "", "call", ""];
  return [line.itemName, `${line.purchaseQty} ${line.purchaseUnit}`, line.unitPrice, line.total];
}

export function Calculator() {
  const settings = settingsStore.useValue();
  const job = jobStore.useValue();
  const [mode, setMode] = useState<Mode>("compare");

  const data = useMemo(() => resolvePricingData(basePricingData, settings), [settings]);
  const available = useMemo(() => new Set(data.canonical.map((c) => c.id)), [data]);
  const result = useMemo(() => calculateNeeds(job, settings, available), [job, settings, available]);
  const comparison = useMemo(() => compareSuppliers(result.needs, data, settings), [result, data, settings]);

  const enabledSuppliers = data.suppliers.filter((s) => comparison.suppliers.includes(s.id));
  const names = Object.fromEntries(data.suppliers.map((s) => [s.id, shortName(s.name)]));
  const guards = data.canonical.filter(
    (c) => c.category === "gutter-guards" && c.baseUnit === "ft" && c.id.startsWith(`guard-${job.gutterSize}-`),
  );

  const supplierId = mode.startsWith("supplier:") ? mode.slice("supplier:".length) : null;
  const basis = supplierId
    ? { total: comparison.totals[supplierId]?.total ?? 0, label: names[supplierId] }
    : mode === "mix"
      ? { total: comparison.mix.total, label: "cheapest mix" }
      : comparison.bestSingle
        ? { total: comparison.bestSingle.total, label: names[comparison.bestSingle.supplierId] }
        : { total: comparison.mix.total, label: "cheapest mix" };
  const quote = suggestQuote(basis.total, job, result.gutterFt, settings);

  const update = (patch: Partial<JobInput>) => jobStore.write({ ...job, ...patch });
  const updateRun = (id: string, patch: Partial<Run>) =>
    update({ runs: job.runs.map((run) => (run.id === id ? { ...run, ...patch } : run)) });

  const exportCsv = () => {
    const ids = comparison.suppliers;
    const rows = [
      ["Item", "Need", "Unit", ...ids.flatMap((id) => [`${names[id]} item`, `${names[id]} buy`, `${names[id]} unit price`, `${names[id]} total`])],
      ...comparison.lines.map((line) => [
        line.name,
        Number(line.need.quantity.toFixed(2)),
        line.baseUnit,
        ...ids.flatMap((id) => lineCells(line.bySupplier[id])),
      ]),
      [],
      ["Total", "", "", ...ids.flatMap((id) => ["", "", "", comparison.totals[id].total])],
      ["Cheapest mix", comparison.mix.total],
      ["Suggested price", quote.price],
    ];
    downloadFile(`materials-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows), "text/csv");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Material calculator</h1>
        <Link
          href="/calculator/settings"
          className="flex h-11 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium print:hidden"
        >
          <Settings aria-hidden size={18} />
          Settings
        </Link>
      </div>

      <div className="hidden text-sm print:block">
        <p>
          {job.gutterSize}&quot; K-style, {job.color}, {job.downspoutSize} downspouts, {result.gutterFt} ft of gutter
          {job.guardId ? `, guards` : ""}
          {job.tearOff ? ", tear-off" : ""}
        </p>
        <p suppressHydrationWarning>Printed {new Date().toLocaleDateString()}</p>
      </div>

      <Section title="Job" className="print:hidden">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Gutter"
            value={job.gutterSize}
            onChange={(value) => update({ gutterSize: value as GutterSize, guardId: null })}
            options={gutterSizes.map((size) => ({ value: size, label: `${size}" K-style` }))}
          />
          <SelectField
            label="Downspout"
            value={job.downspoutSize}
            onChange={(value) => update({ downspoutSize: value as DownspoutSize })}
            options={downspoutSizes.map((size) => ({ value: size, label: size }))}
          />
          <TextField label="Color" value={job.color} onChange={(color) => update({ color })} />
          <SelectField
            label="Gutter guards"
            value={job.guardId ?? ""}
            onChange={(value) => update({ guardId: value || null })}
            options={[{ value: "", label: "None" }, ...guards.map((g) => ({ value: g.id, label: g.name }))]}
          />
        </div>
        <div className="mt-2">
          <Toggle
            label="Tear-off and haul-away of old gutters"
            checked={job.tearOff}
            onChange={(tearOff) => update({ tearOff })}
          />
        </div>
      </Section>

      <Section title="Runs" className="print:hidden">
        <div className="flex flex-col gap-4">
          {job.runs.map((run) => (
            <div key={run.id} className="rounded-lg border border-line p-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <TextField label="Run name" value={run.label} onChange={(label) => updateRun(run.id, { label })} />
                </div>
                <button
                  type="button"
                  onClick={() => update({ runs: job.runs.filter((r) => r.id !== run.id) })}
                  aria-label={`Remove ${run.label}`}
                  className="flex size-11 items-center justify-center rounded-lg border border-line text-muted"
                >
                  <Trash2 aria-hidden size={18} />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {runFields.map(({ key, label, suffix }) => (
                  <NumberField
                    key={key}
                    label={label}
                    suffix={suffix}
                    value={run[key]}
                    onChange={(value) => updateRun(run.id, { [key]: value })}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button onClick={() => update({ runs: [...job.runs, newRun(job.runs.length + 1)] })}>Add run</Button>
            <Button variant="danger" onClick={() => jobStore.write(defaultJob)}>
              Clear job
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Materials">
        <div className="print:hidden">
          <SelectField
            label="Price from"
            value={mode}
            onChange={(value) => setMode(value as Mode)}
            options={[
              ...enabledSuppliers.map((s) => ({ value: `supplier:${s.id}`, label: s.name })),
              { value: "compare", label: "Compare all" },
              { value: "mix", label: "Cheapest mix" },
            ]}
          />
        </div>
        {result.warnings.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-danger">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <Results mode={mode} comparison={comparison} suppliers={data.suppliers} settings={settings} />
        </div>
        <div className="mt-4">
          <PriceDates suppliers={enabledSuppliers} />
        </div>
      </Section>

      <Section title="Suggested quote">
        <QuotePanel quote={quote} basis={basis.label} />
      </Section>

      <div className="flex gap-2 print:hidden">
        <Button variant="primary" onClick={() => window.print()}>
          Print or save PDF
        </Button>
        <Button onClick={exportCsv}>Export CSV</Button>
      </div>
    </div>
  );
}
