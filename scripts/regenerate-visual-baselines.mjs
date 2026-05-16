#!/usr/bin/env node
/**
 * regenerate-visual-baselines.mjs
 * --------------------------------------------------------------------
 * Safely delete Playwright visual baselines and regenerate them from
 * scratch — without nuking unrelated test artifacts or non-visual specs.
 *
 * What this script touches (and ONLY this):
 *   • `e2e/<spec>-snapshots/`            — Playwright's default baseline dir
 *   • `e2e/__screenshots__/`             — fallback custom snapshot dir
 *   • committed `e2e/**\/*-expected.{png,jpg,jpeg,webp}` reference images
 *
 * What it intentionally leaves alone:
 *   • Source under `src/`, `public/`, `supabase/`
 *   • Vitest unit-test fixtures under `src/test/fixtures/**`
 *   • `test-results/` and `playwright-report/` (CI run output, not baselines)
 *   • Any `*.spec.ts` / `*.spec.tsx` / `*.test.ts` files
 *   • Non-visual specs (specs that don't call `toHaveScreenshot` /
 *     `toMatchSnapshot`) — their snapshot dirs are skipped even if present.
 *
 * Usage:
 *   node scripts/regenerate-visual-baselines.mjs                    # all visual specs
 *   node scripts/regenerate-visual-baselines.mjs visual-regression  # one spec (by stem)
 *   node scripts/regenerate-visual-baselines.mjs --dry-run          # show plan, delete nothing
 *   node scripts/regenerate-visual-baselines.mjs --no-regen         # delete only, skip playwright run
 *   node scripts/regenerate-visual-baselines.mjs --yes              # skip confirmation
 *
 * Exit codes:
 *   0  success (or dry-run completed)
 *   1  invalid arguments / refused safety check
 *   2  playwright regen step failed
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const E2E_DIR = join(REPO_ROOT, "e2e");

const args = process.argv.slice(2);
const DRY_RUN  = args.includes("--dry-run");
const NO_REGEN = args.includes("--no-regen");
const YES      = args.includes("--yes") || args.includes("-y");
const FILTER   = args.find((a) => !a.startsWith("-"))?.replace(/\.spec\.tsx?$/, "");

const log  = (m) => process.stdout.write(`${m}\n`);
const warn = (m) => process.stderr.write(`⚠️  ${m}\n`);
const die  = (m, code = 1) => { warn(m); process.exit(code); };

if (!existsSync(E2E_DIR)) die(`e2e/ directory not found at ${E2E_DIR}`);

/** Recursively find paths under root matching a predicate. */
function walk(root, predicate, out = []) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, entry.name);
    if (entry.isDirectory()) {
      if (predicate(p, entry)) out.push({ path: p, kind: "dir" });
      else walk(p, predicate, out);
    } else if (predicate(p, entry)) {
      out.push({ path: p, kind: "file" });
    }
  }
  return out;
}

/** Is this spec actually a visual spec? (avoids deleting unrelated dirs.) */
function isVisualSpec(specPath) {
  if (!existsSync(specPath)) return false;
  const src = readFileSync(specPath, "utf8");
  return /toHaveScreenshot\s*\(|toMatchSnapshot\s*\(/.test(src);
}

// ---------------------------------------------------------------------------
// 1. Build the deletion plan
// ---------------------------------------------------------------------------
const specFiles = readdirSync(E2E_DIR)
  .filter((f) => /\.spec\.tsx?$/.test(f))
  .filter((f) => (FILTER ? f.startsWith(FILTER) : true));

if (FILTER && specFiles.length === 0) {
  die(`No spec matched "${FILTER}" in e2e/. Available:\n  ${
    readdirSync(E2E_DIR).filter((f) => /\.spec\.tsx?$/.test(f)).join("\n  ")
  }`);
}

const targets = [];

// (a) Per-spec snapshot dirs: `e2e/<spec>-snapshots/`
for (const spec of specFiles) {
  const specPath = join(E2E_DIR, spec);
  if (!isVisualSpec(specPath)) {
    log(`↷ skipping ${spec} — no toHaveScreenshot/toMatchSnapshot calls`);
    continue;
  }
  const snapDir = join(E2E_DIR, `${spec.replace(/\.spec\.tsx?$/, "")}.spec.ts-snapshots`);
  const altDir  = join(E2E_DIR, `${spec.replace(/\.spec\.tsx?$/, "")}-snapshots`);
  for (const d of [snapDir, altDir]) {
    if (existsSync(d) && statSync(d).isDirectory()) targets.push({ path: d, kind: "dir" });
  }
}

// (b) Shared custom-snapshot dir, if used.
const sharedSnap = join(E2E_DIR, "__screenshots__");
if (existsSync(sharedSnap) && !FILTER) targets.push({ path: sharedSnap, kind: "dir" });

// (c) Hand-committed *-expected.{png,jpg,jpeg,webp} files under e2e/.
const expectedFiles = walk(
  E2E_DIR,
  (p, entry) => entry.isFile() && /-expected\.(png|jpe?g|webp)$/i.test(p)
);
for (const t of expectedFiles) {
  if (FILTER && !t.path.includes(FILTER)) continue;
  targets.push(t);
}

// Safety: refuse to touch anything outside e2e/.
for (const t of targets) {
  if (!t.path.startsWith(E2E_DIR + "/") && t.path !== E2E_DIR) {
    die(`refused to delete path outside e2e/: ${t.path}`);
  }
}

if (targets.length === 0) {
  log("✅ No baseline files found to delete. Nothing to do.");
  log("   (If you expected matches, check that your specs actually call");
  log("    toHaveScreenshot / toMatchSnapshot, or pass a spec filter.)");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 2. Print the plan
// ---------------------------------------------------------------------------
log("");
log(`Plan — ${DRY_RUN ? "DRY RUN (nothing will be deleted)" : "DELETE the following baselines"}:`);
log("");
for (const t of targets) {
  log(`  ${t.kind === "dir" ? "📁" : "🖼"}  ${relative(REPO_ROOT, t.path)}`);
}
log("");
log(`Total: ${targets.length} path(s).`);
log("Safe-list: only paths under e2e/ matching snapshot conventions are eligible.");
log("");

if (DRY_RUN) {
  log("Dry run complete — re-run without --dry-run to apply.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 3. Confirm
// ---------------------------------------------------------------------------
async function confirm() {
  if (YES) return true;
  if (!process.stdin.isTTY) {
    warn("non-interactive shell — pass --yes to skip the prompt.");
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) =>
    rl.question("Proceed? [y/N] ", (a) => { rl.close(); res(/^y(es)?$/i.test(a.trim())); })
  );
}

if (!(await confirm())) die("aborted by user.");

// ---------------------------------------------------------------------------
// 4. Delete
// ---------------------------------------------------------------------------
for (const t of targets) {
  rmSync(t.path, { recursive: true, force: true });
  log(`🗑  removed ${relative(REPO_ROOT, t.path)}`);
}
log("");

// ---------------------------------------------------------------------------
// 5. Regenerate via playwright (unless --no-regen)
// ---------------------------------------------------------------------------
if (NO_REGEN) {
  log("✅ Baselines deleted. Skipping regeneration (--no-regen).");
  log("   Run `bunx playwright test --update-snapshots` when you're ready.");
  process.exit(0);
}

const pwArgs = ["playwright", "test", "--update-snapshots", "--reporter=list"];
if (FILTER) pwArgs.push(`e2e/${specFiles[0]}`);

log(`▶  Regenerating baselines: bunx ${pwArgs.join(" ")}`);
const result = spawnSync("bunx", pwArgs, { stdio: "inherit", cwd: REPO_ROOT });
if (result.status !== 0) {
  die(`playwright exited with code ${result.status}. Baselines are deleted but not regenerated.`, 2);
}

log("");
log("✅ Baselines regenerated. Review the diff with:");
log(`   git status -- e2e/ | head`);
log(`   git add -p e2e/`);
log("");
log("Then commit and push. CI will require the `update-snapshots` label on");
log("the PR before the snapshot guard allows the new baselines through.");
