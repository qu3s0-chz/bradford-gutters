import type {
  CalculatorSettings,
  CoilSetting,
  DownspoutSize,
  GutterSize,
} from "./settings.ts";

export interface Run {
  id: string;
  label: string;
  lengthFt: number;
  insideMiters: number;
  outsideMiters: number;
  endCaps: number;
  downspouts: number;
  downspoutHeightFt: number;
  elbowsPerDownspout: number;
}

export interface JobInput {
  gutterSize: GutterSize;
  downspoutSize: DownspoutSize;
  color: string;
  runs: Run[];
  /** Canonical id of a per-foot guard, or null for none. */
  guardId: string | null;
  tearOff: boolean;
}

export interface MaterialNeed {
  canonicalId: string;
  /** In the canonical item's base unit: lb, ft or each. */
  quantity: number;
  basis: string;
}

export interface NeedsResult {
  needs: MaterialNeed[];
  warnings: string[];
  gutterFt: number;
  downspoutFt: number;
}

const count = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);
const whole = (value: number) => Math.floor(count(value));
const ceil = (value: number) => Math.ceil(value - 1e-9);

/** Pounds of coil per foot of gutter: width x 12 in x thickness x density. */
export function coilLbPerFt(coil: CoilSetting, lbPerCubicIn: number): number {
  return coil.widthIn * 12 * coil.gaugeIn * lbPerCubicIn;
}

export function hangersForRun(lengthFt: number, spacingIn: number): number {
  if (count(lengthFt) === 0 || !(spacingIn > 0)) return 0;
  return ceil((lengthFt * 12) / spacingIn);
}

/** Pick the configured downspout length, or another length the lists carry. */
function downspoutPart(
  size: DownspoutSize,
  preferredFt: number,
  available: Set<string>,
): { id: string; pieceFt: number } | null {
  for (const pieceFt of [preferredFt, 10, 8]) {
    const id = `ds-${size}-${pieceFt}`;
    if (available.has(id)) return { id, pieceFt };
  }
  return null;
}

export function calculateNeeds(
  job: JobInput,
  settings: CalculatorSettings,
  available: Set<string>,
): NeedsResult {
  const { ratios, parts } = settings;
  const warnings: string[] = [];
  const needs = new Map<string, MaterialNeed>();
  const size = job.gutterSize;
  const waste = 1 + count(settings.wastePct) / 100;

  const add = (canonicalId: string, quantity: number, basis: string) => {
    if (!(quantity > 0)) return;
    if (!available.has(canonicalId)) {
      warnings.push(`${canonicalId} isn't in the price lists, so ${basis} can't be priced.`);
    }
    const existing = needs.get(canonicalId);
    if (existing) {
      existing.quantity += quantity;
      existing.basis += `; ${basis}`;
    } else {
      needs.set(canonicalId, { canonicalId, quantity, basis });
    }
  };

  const runs = job.runs;
  const gutterFt = runs.reduce((sum, run) => sum + count(run.lengthFt), 0);
  const gutterWithWaste = gutterFt * waste;

  const coil = settings.coil[size];
  const lbPerFt = coilLbPerFt(coil, settings.aluminumLbPerCubicIn);
  add(
    coil.canonicalId,
    ceil(gutterWithWaste * lbPerFt),
    `${round(gutterWithWaste)} ft of gutter at ${lbPerFt.toFixed(3)} lb/ft`,
  );

  const hangers = runs.reduce(
    (sum, run) => sum + hangersForRun(run.lengthFt, settings.hangerSpacingIn),
    0,
  );
  add(parts.hanger[size], hangers, `1 per ${settings.hangerSpacingIn} in of each run`);

  const endCaps = runs.reduce((sum, run) => sum + whole(run.endCaps), 0);
  add(`endcap-${size}`, endCaps, "end caps entered");

  const inside = runs.reduce((sum, run) => sum + whole(run.insideMiters), 0);
  const outside = runs.reduce((sum, run) => sum + whole(run.outsideMiters), 0);
  add(`miter-${size}-${parts.miterStyle}-inside`, inside, "inside miters entered");
  add(`miter-${size}-${parts.miterStyle}-outside`, outside, "outside miters entered");

  const downspout = downspoutPart(job.downspoutSize, parts.downspoutPieceFt, available);
  let downspouts = 0;
  let downspoutFt = 0;
  let splices = 0;
  let straps = 0;
  let elbows = 0;

  for (const run of runs) {
    const spouts = whole(run.downspouts);
    if (spouts === 0) continue;
    downspouts += spouts;
    elbows += spouts * whole(run.elbowsPerDownspout);

    const height = count(run.downspoutHeightFt);
    if (height > 0) {
      straps +=
        spouts *
        Math.max(whole(ratios.minStrapsPerDownspout), ratios.strapSpacingFt > 0 ? ceil(height / ratios.strapSpacingFt) : 0);
      if (downspout) {
        const pieces = ceil(height / downspout.pieceFt);
        downspoutFt += spouts * pieces * downspout.pieceFt;
        splices += spouts * (pieces - 1);
      }
    }
  }

  if (downspouts > 0 && !downspout) {
    warnings.push(`No ${job.downspoutSize} downspout is in the price lists.`);
  }
  if (downspout) {
    add(
      downspout.id,
      downspoutFt,
      `${downspouts} downspouts cut from ${downspout.pieceFt} ft pieces`,
    );
    if (downspout.pieceFt !== parts.downspoutPieceFt && downspoutFt > 0) {
      warnings.push(
        `No ${parts.downspoutPieceFt} ft ${job.downspoutSize} downspout is listed, so ${downspout.pieceFt} ft pieces are used.`,
      );
    }
  }

  add(`elbow-${job.downspoutSize}-${parts.elbowStyle}`, elbows, "elbows per downspout");
  add(`outlet-${job.downspoutSize}`, downspouts, "1 per downspout");
  add(parts.strap, straps, `1 per ${ratios.strapSpacingFt} ft of downspout, at least ${ratios.minStrapsPerDownspout}`);

  const zipScrews =
    elbows * count(ratios.zipScrewsPerElbow) +
    straps * count(ratios.zipScrewsPerStrap) +
    splices * count(ratios.zipScrewsPerDownspoutSplice);
  add(parts.zipScrew, ceil(zipScrews), "elbows, straps and downspout splices");

  const miters = inside + outside;
  const rivets =
    downspouts * count(ratios.rivetsPerOutlet) +
    miters * count(ratios.rivetsPerMiter) +
    endCaps * count(ratios.rivetsPerEndCap);
  add(parts.rivet, ceil(rivets), "outlets, miters and end caps");

  add(parts.hexScrew, ceil(hangers * count(ratios.hexScrewsPerHanger)), "hangers");

  const joints = endCaps + miters + downspouts;
  if (ratios.sealantJointsPerTube > 0) {
    add(parts.sealant, ceil(joints / ratios.sealantJointsPerTube), `${joints} sealed joints`);
  }

  if (job.guardId) {
    add(job.guardId, ceil(gutterWithWaste), "gutter length plus waste");
  }

  return { needs: [...needs.values()], warnings, gutterFt, downspoutFt };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
