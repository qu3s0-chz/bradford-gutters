"use client";

import type { JobInput, Run } from "@/calculator/lib/calculate.ts";
import { defaultSettings, withDefaults } from "@/calculator/lib/settings.ts";
import { createLocalStore } from "./local-store";

export const settingsStore = createLocalStore(
  "bsg-calculator-settings-v1",
  defaultSettings,
  withDefaults,
);

export function newRun(index: number): Run {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    label: `Run ${index}`,
    lengthFt: 0,
    insideMiters: 0,
    outsideMiters: 0,
    endCaps: 2,
    downspouts: 1,
    downspoutHeightFt: 10,
    elbowsPerDownspout: 3,
  };
}

export const defaultJob: JobInput = {
  gutterSize: "6",
  downspoutSize: "3x4",
  color: "White",
  runs: [{ ...newRun(1), id: "run-1" }],
  guardId: null,
  tearOff: false,
};

function normalizeJob(raw: unknown): JobInput {
  if (typeof raw !== "object" || raw === null) return defaultJob;
  const job = { ...defaultJob, ...(raw as Partial<JobInput>) };
  return Array.isArray(job.runs) ? job : defaultJob;
}

export const jobStore = createLocalStore("bsg-calculator-job-v1", defaultJob, normalizeJob);
