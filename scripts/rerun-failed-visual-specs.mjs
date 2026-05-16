#!/usr/bin/env node
/**
 * rerun-failed-visual-specs.mjs
 * --------------------------------------------------------------------
 * Speed up the visual-regression debug loop: parse the last Playwright
 * report, pull out every failed test, and re-run *only* those — scoped
 * to the right spec file, project (desktop/tablet/mobile), and test
 * title — instead of re-executing the whole suite.
 *
 * Lookup order (first hit wins):
 *
 *   1. `test-results/.last-run.json` — Playwright's native run summary
 *      (written automatically by every `playwright test` invocation
 *      since v1.36). Contains `status` + `failedTests[]` UUIDs that
 *      `playwright test --last-failed` understands directly.
 *
 *   2. `playwright-report/data/*.json` — the per-test JSON blobs
 *      written by the HTML reporter. Each blob has `title`, `location`
 *      (file + line), and `projectName`, so we can rebuild a precise
 *      argv even when `.last-run.json` is missing (e.g. when only the
 *      `html` reporter ran, or the report was downloaded from CI).
 *
 *   3. Bail with a useful message if neither exists.
 *
 * Usage:
 *   node scripts/rerun-failed-visual-specs.mjs               # re-run all failures
 *   node scripts/rerun-failed-visual-specs.mjs --dry-run     # print the argv only
 *   node scripts/rerun-failed-visual-specs.mjs --ui          # open in Playwright UI
 *   node scripts/rerun-failed-visual-specs.mjs --headed      # headed browser
 *   node scripts/rerun-failed-visual-specs.mjs --update-snapshots
 *   node scripts/rerun-failed-visual-specs.mjs --report path/to/playwright-report
 *
 * Exit codes:
 *   0 — re-run succeeded (or dry-run completed)
 *   1 — no last-run info found / bad args
 *   2 — playwright sub-process exited non-zero
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const arg  = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const DRY_RUN = flag("--dry-run");
const UI      = flag("--ui");
const HEADED  = flag("--headed");
const UPDATE  = flag("--update-snapshots") || flag("-u");
const REPORT_DIR = arg("--report") ?? join(REPO_ROOT, "playwright-report");
const LAST_RUN   = join(REPO_ROOT, "test-results", ".last-run.json");

const log  = (m) => process.stdout.write(`${m}\n`);
const warn = (m) => process.stderr.write(`⚠️  ${m}\n`);

// ─── 1. Try Playwright's native .last-run.json ──────────────────────────────
function tryLastRunJson() {
  if (!existsSync(LAST_RUN)) return null;
  try {
    const j = JSON.parse(readFileSync(LAST_RUN, "utf8"));
    // Shape: { status: "failed"|"passed"|..., failedTests: ["<uuid>", ...] }
    if (!Array.isArray(j.failedTests) || j.failedTests.length === 0) return null;
    log(`📄 Found ${j.failedTests.length} failed test(s) in test-results/.last-run.json`);
    log(`   Status of last run: ${j.status}`);
    // `--last-failed` resolves these UUIDs against the same .last-run.json.
    return { mode: "last-failed", count: j.failedTests.length, extra: [] };
  } catch (e) {
    warn(`could not parse ${relative(REPO_ROOT, LAST_RUN)}: ${e.message}`);
    return null;
  }
}

// ─── 2. Fall back to playwright-report/data/*.json ──────────────────────────
function tryHtmlReportData() {
  const dataDir = join(REPORT_DIR, "data");
  if (!existsSync(dataDir)) return null;

  const fails = new Map(); // key = `${file}::${project}::${title}` → {file, project, title}
  for (const f of readdirSync(dataDir)) {
    if (!f.endsWith(".json")) continue;
    let blob;
    try { blob = JSON.parse(readFileSync(join(dataDir, f), "utf8")); }
    catch { continue; }

    // Two shapes ship across Playwright versions: a flat per-test blob,
    // and the aggregated `report.json` with `files[].tests[]`. Handle both.
    const collect = (test) => {
      if (!test || !test.results) return;
      const failed = test.results.some(
        (r) => r.status === "failed" || r.status === "timedOut"
      );
      if (!failed) return;
      const file    = test.location?.file ?? test.path?.[0] ?? "";
      const title   = test.title ?? test.path?.slice(1).join(" › ") ?? "";
      const project = test.projectName ?? test.projectId ?? "";
      if (!file || !title) return;
      fails.set(`${file}::${project}::${title}`, { file, project, title });
    };

    if (Array.isArray(blob.results))        collect(blob);            // flat per-test
    if (Array.isArray(blob.files)) {
      for (const fileEntry of blob.files) {
        const walk = (suite) => {
          for (const t of suite.tests ?? []) collect({ ...t, location: { file: fileEntry.fileName } });
          for (const s of suite.suites ?? []) walk(s);
        };
        walk(fileEntry);
      }
    }
  }

  if (fails.size === 0) return null;
  log(`📄 Found ${fails.size} failed test(s) in ${relative(REPO_ROOT, REPORT_DIR)}/data/`);
  return { mode: "from-report", entries: [...fails.values()] };
}

const plan = tryLastRunJson() ?? tryHtmlReportData();
if (!plan) {
  warn("No prior Playwright run found.");
  warn(`  Looked for: ${relative(REPO_ROOT, LAST_RUN)}`);
  warn(`  And:        ${relative(REPO_ROOT, REPORT_DIR)}/data/*.json`);
  warn("Run `bun run test:e2e` once first, then retry this script.");
  process.exit(1);
}

// ─── Build the playwright argv ──────────────────────────────────────────────
const pwArgs = ["playwright"];
pwArgs.push(UI ? "test" : "test");
if (UI)     pwArgs.push("--ui");
if (HEADED) pwArgs.push("--headed");
if (UPDATE) pwArgs.push("--update-snapshots");

if (plan.mode === "last-failed") {
  pwArgs.push("--last-failed");
} else {
  // Group failed tests by spec file so we pass each file only once,
  // and union all titles into a single --grep regex (anchored, escaped).
  const byFile = new Map();
  for (const e of plan.entries) {
    if (!byFile.has(e.file)) byFile.set(e.file, { titles: new Set(), projects: new Set() });
    const b = byFile.get(e.file);
    b.titles.add(e.title);
    if (e.project) b.projects.add(e.project);
  }

  // Playwright accepts multiple spec files in one invocation but only one
  // --grep / --project pair. If failures span multiple projects, we
  // intentionally drop the --project filter (Playwright will run matching
  // titles in every project, which is the correct re-run for cross-project
  // regressions). If they're all in one project, scope it.
  const allProjects = new Set(plan.entries.map((e) => e.project).filter(Boolean));
  if (allProjects.size === 1) pwArgs.push(`--project=${[...allProjects][0]}`);

  const allTitles = plan.entries.map((e) => e.title);
  const escaped   = allTitles.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  pwArgs.push("--grep", `(${escaped.join("|")})`);

  for (const f of byFile.keys()) {
    pwArgs.push(relative(REPO_ROOT, f) || f);
  }
}

log("");
log("▶ Re-run plan:");
log(`  bunx ${pwArgs.join(" ")}`);
log("");
if (DRY_RUN) {
  log("Dry run — exiting without invoking Playwright.");
  process.exit(0);
}

const res = spawnSync("bunx", pwArgs, { stdio: "inherit", cwd: REPO_ROOT });
process.exit(res.status === 0 ? 0 : 2);
