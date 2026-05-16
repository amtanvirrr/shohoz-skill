#!/usr/bin/env node
/**
 * open-first-failing-diff.mjs
 * --------------------------------------------------------------------
 * Open the diff PNG for the *first* failing Playwright visual test in
 * the OS default image viewer — no more digging through
 * `test-results/<some-long-hash>/` by hand.
 *
 * Lookup order (first hit wins):
 *
 *   1. `test-results/.last-run.json` + sibling per-test dirs — Playwright
 *      writes one directory per (test × project × retry) under
 *      `test-results/`. We pick the lexically-first dir that contains a
 *      `*-diff.png` and open that PNG.
 *
 *   2. Plain glob of `test-results/<dir>/*-diff.png` — covers the case
 *      where `.last-run.json` is missing (e.g. report downloaded from CI).
 *
 *   3. `playwright-report/data/attachments/*-diff.png` — fallback when
 *      only the HTML report was kept and `test-results/` was pruned.
 *
 * Flags:
 *   --actual          open the *-actual.png instead of *-diff.png
 *   --expected        open the *-expected.png instead
 *   --all             open every diff (not just the first)
 *   --print           print the path(s) to stdout and exit, don't open
 *   --report <dir>    override `playwright-report` path
 *   --results <dir>   override `test-results`     path
 *
 * Exit codes:
 *   0 — opened (or printed) successfully
 *   1 — no diff PNGs found
 *   2 — OS opener exited non-zero
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const arg  = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

const KIND        = flag("--actual") ? "actual" : flag("--expected") ? "expected" : "diff";
const ALL         = flag("--all");
const PRINT_ONLY  = flag("--print");
const RESULTS_DIR = resolve(REPO_ROOT, arg("--results") ?? "test-results");
const REPORT_DIR  = resolve(REPO_ROOT, arg("--report")  ?? "playwright-report");

const SUFFIX = `-${KIND}.png`;

const log  = (m) => process.stdout.write(`${m}\n`);
const warn = (m) => process.stderr.write(`⚠️  ${m}\n`);

/** Recursively collect every `*-<KIND>.png` under root. */
function findImages(root) {
  if (!existsSync(root)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile() && entry.name.endsWith(SUFFIX)) out.push(p);
    }
  };
  walk(root);
  // Lexical sort gives a deterministic "first" — Playwright's per-test
  // dir names embed the spec path + project, so this also groups by
  // spec naturally.
  return out.sort();
}

let images = findImages(RESULTS_DIR);
let source = "test-results";
if (images.length === 0) {
  images = findImages(join(REPORT_DIR, "data"));
  source = "playwright-report/data";
}

if (images.length === 0) {
  warn(`No \`*${SUFFIX}\` files found.`);
  warn(`  Searched: ${relative(REPO_ROOT, RESULTS_DIR)}/`);
  warn(`  And:      ${relative(REPO_ROOT, join(REPORT_DIR, "data"))}/`);
  warn("Run the visual suite first: `bun run test:e2e`");
  process.exit(1);
}

const targets = ALL ? images : [images[0]];

log(`📁 Source: ${source}/`);
log(`🖼  ${KIND.toUpperCase()} image${targets.length > 1 ? "s" : ""}:`);
for (const t of targets) log(`   ${relative(REPO_ROOT, t)}`);

if (PRINT_ONLY) process.exit(0);

// Cross-platform open: macOS `open`, Linux `xdg-open`, Windows `start`.
function osOpen(file) {
  if (process.platform === "darwin") return spawnSync("open", [file], { stdio: "inherit" });
  if (process.platform === "win32")  return spawnSync("cmd",  ["/c", "start", "", file], { stdio: "inherit" });
  return spawnSync("xdg-open", [file], { stdio: "inherit" });
}

let failed = 0;
for (const t of targets) {
  const r = osOpen(t);
  if (r.status !== 0 || r.error) {
    warn(`failed to open ${relative(REPO_ROOT, t)}${r.error ? `: ${r.error.message}` : ""}`);
    failed++;
  }
}
process.exit(failed === 0 ? 0 : 2);
