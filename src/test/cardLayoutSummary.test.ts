import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SCRIPT = resolve(ROOT, "scripts/card-layout-summary.mjs");
const FIXTURES = resolve(__dirname, "fixtures/vitest-reports");

/**
 * Run the summary script against a fixture JSON report and return its
 * combined stdout. We deliberately invoke it as a real child process so we
 * exercise the same code path CI uses (file I/O, raw-text fallback, etc.).
 * GITHUB_STEP_SUMMARY is intentionally unset so the Markdown lands on stdout.
 */
const runScript = (fixture: string): string => {
  const env = { ...process.env };
  delete env.GITHUB_STEP_SUMMARY;
  const out = execFileSync(
    process.execPath,
    [SCRIPT, resolve(FIXTURES, fixture)],
    { encoding: "utf8", env },
  );
  return out;
};

describe("card-layout-summary parser — vitest JSON shape compatibility", () => {
  it("extracts TOKEN_MISMATCH from the Jest-compatible reporter shape", () => {
    const out = runScript("jest-compatible.json");
    expect(out).toContain("BYLINE_LAYOUT_CLASS");
    expect(out).toContain("min-h-[2.5rem]");
    expect(out).toContain("byline reserves height");
    // Mapped source → CourseCard/cardStyles location column.
    expect(out).toContain("src/lib/cardStyles.ts");
  });

  it("extracts TOKEN_MISMATCH from the native vitest task-tree shape", () => {
    const out = runScript("task-tree.json");
    expect(out).toContain("CARD_TITLE_CLASS");
    expect(out).toContain("sm:min-h-[3.25rem]");
    // Walker must descend into files[].tasks[].tasks[] and read result.errors.
    expect(out).toContain("CARD_TITLE_CLASS reserves min-h");
  });

  it("extracts TOKEN_MISMATCH from the nested-suites shape", () => {
    const out = runScript("nested-suites.json");
    expect(out).toContain("CARD_DESCRIPTION_CLASS");
    expect(out).toContain("min-h-[2rem]");
    expect(out).toContain("description reserves height");
  });

  it("emits ONE row per token when a single failure batches many mismatches", () => {
    const out = runScript("batched-mismatches.json");
    // expectAllTokens collects every drift; the summary table must list each.
    for (const tok of ["min-h-[2.5rem]", "sm:min-h-[2.75rem]", "md:min-h-[1.5rem]"]) {
      expect(out, `missing ${tok} row`).toContain(tok);
    }
    // Footer count should reflect the batch, not the single failing test.
    expect(out).toMatch(/3 mismatched token\(s\) across 1 failing test\(s\)/);
    // Skeleton source maps to the FeaturedCardSkeleton.tsx location column.
    expect(out).toContain("src/components/FeaturedCardSkeleton.tsx");
  });

  it("recovers TOKEN_MISMATCH from malformed JSON via raw-text fallback", () => {
    const out = runScript("malformed.json");
    expect(out).toContain("ProductCardSkeleton.innerHTML");
    expect(out).toContain("h-6 w-20");
    // Orphan rows are bucketed under the synthetic recovery label.
    expect(out).toContain("(unattributed — recovered from raw report)");
  });

  it("recovers TOKEN_MISMATCH even when the report is non-JSON garbage", () => {
    const out = runScript("garbage.json");
    expect(out).toContain("CARD_TITLE_CLASS");
    expect(out).toContain("leading-snug");
    expect(out).toContain("(unattributed — recovered from raw report)");
  });

  it("recovers only the complete TOKEN_MISMATCH block when JSON cuts mid-block", () => {
    const out = runScript("truncated-mid-block.json");
    // First block (complete) must surface.
    expect(out).toContain("min-h-[2.5rem]");
    // Second block was cut mid-token — it must NOT be reported as if complete.
    expect(out).not.toContain("sm:min-h-\n");
    expect(out).not.toContain("`sm:min-h-`");
    // Exactly one row in the table (footer count proves it).
    expect(out).toMatch(/1 mismatched token\(s\)/);
  });

  it("recovers TOKEN_MISMATCH buried in an unrecognised JSON field", () => {
    const out = runScript("unknown-field.json");
    // The structured walker can't find a `failed` node here — the raw-text
    // fallback is the ONLY path that surfaces this drift.
    expect(out).toContain("BYLINE_LAYOUT_CLASS");
    expect(out).toContain("md:line-clamp-1");
    expect(out).toContain("(unattributed — recovered from raw report)");
  });

  it("does not double-count when the same TOKEN_MISMATCH appears in JSON and raw text", () => {
    const out = runScript("dedup.json");
    // The exact same drift shows up in both the assertion's failureMessages
    // AND a sibling stderr field. We must report it exactly once.
    const rows = out.match(/min-h-\[2\.5rem\]/g) ?? [];
    // Cell appears in: token column, expected column, annotation message —
    // that's per-row noise. The footer count is the authoritative signal.
    expect(out).toMatch(/1 mismatched token\(s\) across 1 failing test\(s\)/);
    // And the "(unattributed)" bucket must NOT appear for the duplicate.
    expect(out).not.toContain("(unattributed — recovered from raw report)");
    // Sanity check: the token does show up at least once.
    expect(rows.length).toBeGreaterThan(0);
  });
});