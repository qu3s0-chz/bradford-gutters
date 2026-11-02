"use client";

import type { PricingSupplier } from "@/calculator/lib/data.ts";
import type { Comparison, QuoteSummary, SupplierLine, SupplierTotals } from "@/calculator/lib/pricing.ts";
import type { CalculatorSettings } from "@/calculator/lib/settings.ts";
import { daysOld, formatMoney, shortName } from "./pricing-data";

export type Mode = "compare" | "mix" | `supplier:${string}`;

const qty = (value: number) => Number(value.toFixed(2)).toLocaleString("en-US");

function LineCell({ line, highlight }: { line: SupplierLine; highlight?: boolean }) {
  if (line.status === "not-carried") return <span className="text-danger">Not carried</span>;
  if (line.status === "no-price") return <span className="text-danger">Call for price</span>;
  return (
    <span className={highlight ? "font-semibold text-brand" : undefined}>
      {formatMoney(line.total)}
      <span className="block text-xs font-normal text-muted">
        {qty(line.purchaseQty)} {line.purchaseUnit} × {formatMoney(line.unitPrice)}
        {line.roundedToCarton && " (full cartons)"}
      </span>
    </span>
  );
}

function TotalsRows({ totals, settings }: { totals: SupplierTotals; settings: CalculatorSettings }) {
  const tax = settings.suppliers[totals.supplierId]?.taxRatePct ?? 0;
  return (
    <>
      <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
      <Row label={`Tax (${tax}%)`} value={formatMoney(totals.tax)} />
      <Row label="Delivery" value={formatMoney(totals.delivery)} />
      <Row label="Total" value={formatMoney(totals.total)} strong />
      {totals.belowMinimum && (
        <p className="text-sm text-danger">
          Below the {formatMoney(totals.minimumOrder)} minimum order.
        </p>
      )}
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1 ${strong ? "border-t border-line pt-2 font-semibold" : "text-sm"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function Results({
  mode,
  comparison,
  suppliers,
  settings,
}: {
  mode: Mode;
  comparison: Comparison;
  suppliers: PricingSupplier[];
  settings: CalculatorSettings;
}) {
  const names = Object.fromEntries(suppliers.map((s) => [s.id, shortName(s.name)]));
  const { lines, totals, mix } = comparison;

  if (lines.length === 0) {
    return <p className="text-muted">Enter a run length to see materials.</p>;
  }

  if (mode.startsWith("supplier:")) {
    const id = mode.slice("supplier:".length);
    const supplierTotals = totals[id];
    if (!supplierTotals) return <p className="text-muted">That supplier is turned off in settings.</p>;

    return (
      <div>
        <ul className="divide-y divide-line">
          {lines.map((line) => (
            <li key={line.need.canonicalId} className="flex justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block font-medium">{line.name}</span>
                <span className="block text-xs text-muted">
                  Need {qty(line.need.quantity)} {line.baseUnit}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <LineCell line={line.bySupplier[id]} />
              </span>
            </li>
          ))}
        </ul>
        {supplierTotals.missing.length > 0 && (
          <p className="mt-2 text-sm text-danger">
            {supplierTotals.missing.length} item(s) can&apos;t be priced from {names[id]}. The total leaves them out.
          </p>
        )}
        <div className="mt-3">
          <TotalsRows totals={supplierTotals} settings={settings} />
        </div>
      </div>
    );
  }

  if (mode === "compare") {
    const ids = comparison.suppliers;
    const cheapestTotal = comparison.bestSingle?.supplierId;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="py-2 pr-2 font-medium">Item</th>
              {ids.map((id) => (
                <th key={id} className="py-2 pl-2 text-right font-medium">
                  {names[id]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((line) => (
              <tr key={line.need.canonicalId} className="align-top">
                <td className="py-2 pr-2">
                  {line.name}
                  <span className="block text-xs text-muted">
                    Need {qty(line.need.quantity)} {line.baseUnit}
                  </span>
                </td>
                {ids.map((id) => (
                  <td
                    key={id}
                    className={`py-2 pl-2 text-right ${line.cheapest === id && ids.length > 1 ? "bg-brand-soft" : ""}`}
                  >
                    <LineCell line={line.bySupplier[id]} highlight={line.cheapest === id && ids.length > 1} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-line">
            {(["subtotal", "tax", "delivery", "total"] as const).map((key) => (
              <tr key={key} className={key === "total" ? "font-semibold" : "text-muted"}>
                <td className="py-1 pr-2 capitalize">{key}</td>
                {ids.map((id) => (
                  <td
                    key={id}
                    className={`py-1 pl-2 text-right ${key === "total" && cheapestTotal === id ? "bg-brand-soft text-brand" : ""}`}
                  >
                    {formatMoney(totals[id][key])}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="text-xs">
              <td className="py-1 pr-2 text-muted">Missing</td>
              {ids.map((id) => (
                <td key={id} className={`py-1 pl-2 text-right ${totals[id].missing.length ? "text-danger" : "text-muted"}`}>
                  {totals[id].missing.length ? `${totals[id].missing.length} not carried` : "None"}
                  {totals[id].belowMinimum && <span className="block text-danger">Below minimum</span>}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
        <p className="mt-3 text-sm text-muted">
          {comparison.bestSingle
            ? `Cheapest single supplier: ${names[comparison.bestSingle.supplierId]}, ${formatMoney(comparison.bestSingle.total)}.`
            : "No single supplier carries everything. Try Cheapest mix."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {lines.map((line) => {
          const pick = mix.picks[line.need.canonicalId];
          return (
            <li key={line.need.canonicalId} className="flex justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block font-medium">{line.name}</span>
                <span className="block text-xs text-muted">
                  {pick ? `From ${names[pick]}` : "No supplier carries this"}
                </span>
              </span>
              <span className="shrink-0 text-right">
                {pick ? <LineCell line={line.bySupplier[pick]} /> : <span className="text-danger">Not carried</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-col gap-3">
        {mix.totals.map((t) => (
          <div key={t.supplierId}>
            <p className="font-medium">{names[t.supplierId]}</p>
            <TotalsRows totals={t} settings={settings} />
          </div>
        ))}
        <Row label="Mix total" value={formatMoney(mix.total)} strong />
        <p className="text-sm">
          Uses {mix.suppliers.length} supplier{mix.suppliers.length === 1 ? "" : "s"}
          {mix.suppliers.length > 1 ? `, so ${mix.suppliers.length} pickup stops` : ", one stop"}.
        </p>
        <p className="text-sm text-muted">
          {mix.savingsVsBestSingle === null
            ? "No single supplier carries everything, so there's nothing to compare against."
            : mix.savingsVsBestSingle > 0
              ? `Saves ${formatMoney(mix.savingsVsBestSingle)} vs ${names[mix.bestSingle!.supplierId]} alone.`
              : `Same as buying everything from ${names[mix.bestSingle!.supplierId]}.`}
        </p>
      </div>
    </div>
  );
}

export function QuotePanel({ quote, basis }: { quote: QuoteSummary; basis: string }) {
  return (
    <div>
      <Row label={`Materials (${basis})`} value={formatMoney(quote.materials)} />
      <Row label="Markup" value={formatMoney(quote.markup)} />
      <Row label="Labor" value={formatMoney(quote.labor)} />
      {quote.tearOff > 0 && <Row label="Tear-off and haul-away" value={formatMoney(quote.tearOff)} />}
      <Row label="Suggested price" value={formatMoney(quote.price)} strong />
      <Row
        label="Margin over materials"
        value={`${formatMoney(quote.grossProfit)} (${quote.marginPct}%)`}
      />
      <p className="mt-1 text-xs text-muted">Labor is counted as charged; your labor cost isn&apos;t subtracted.</p>
    </div>
  );
}

export function PriceDates({ suppliers }: { suppliers: PricingSupplier[] }) {
  return (
    <ul className="text-xs text-muted">
      {suppliers.map((s) => {
        const age = daysOld(s.asOf);
        return (
          <li key={s.id} className={age > 90 ? "text-danger" : undefined}>
            {s.name}: prices as of {s.asOf}
            {s.priceListDate ? "" : " (scan date)"}
            {age > 90 ? `, ${age} days old` : ""}
          </li>
        );
      })}
    </ul>
  );
}
