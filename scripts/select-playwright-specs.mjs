#!/usr/bin/env node
/**
 * Decide which Playwright specs to run for a PR based on the files it
 * changed. Prints a single line to stdout that the workflow `eval`s into
 * arguments for `bunx playwright test`. When nothing visual changed we
 * print `SKIP` so the workflow can short-circuit the whole job.
 *
 * Usage:
 *   node scripts/select-playwright-specs.mjs <changed-files-list-path>
 *   node scripts/select-playwright-specs.mjs --files "a.tsx b.tsx" --debug
 *
 * Selection rules (first match wins, OR'd together):
 *   1. "Tripwire" files (cardStyles.ts, tailwind/postcss/vite config, index.css,
 *      playwright.config.*, the e2e/ tree itself) → run EVERY spec. These
 *      bottlenecks affect rendering globally, so partial coverage would be
 *      unsafe.
 *   2. Per-component / per-page mappings → run the spec(s) that exercise the
 *      changed surface.
 *   3. Nothing matched → emit SKIP (workflow step turns this into a no-op
 *      with a green status + a Markdown note explaining why).
 *
 * The mapping table is intentionally over-inclusive: when in doubt we run
 * more specs, never fewer. Reviewers shouldn't have to remember to flip a
 * label to get visual coverage.
 */

import { readFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const DEBUG = args.includes("--debug");
const filesArgIdx = args.indexOf("--files");

/** @type {string[]} */
let changed = [];
if (filesArgIdx !== -1) {
  changed = (args[filesArgIdx + 1] ?? "").split(/\s+/).filter(Boolean);
} else {
  const filePath = args.find((a) => !a.startsWith("--"));
  if (!filePath || !existsSync(filePath)) {
    process.stderr.write(
      "select-playwright-specs: no changed-files input — running all specs.\n",
    );
    process.stdout.write("ALL\n");
    process.exit(0);
  }
  changed = readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
}

const dbg = (...m) => {
  if (DEBUG) process.stderr.write(`[select-specs] ${m.join(" ")}\n`);
};

/**
 * Tripwires: any change to one of these forces a full visual run because the
 * blast radius covers every rendered surface.
 */
const TRIPWIRES = [
  /^src\/lib\/cardStyles\.ts$/,
  /^src\/index\.css$/,
  /^src\/App\.css$/,
  /^tailwind\.config\.[cm]?[jt]s$/,
  /^postcss\.config\.[cm]?[jt]s$/,
  /^vite\.config\.[cm]?[jt]s$/,
  /^playwright\.config\.[cm]?[jt]s$/,
  /^e2e\//, // editing a spec or e2e helper → must re-run them
  /^src\/components\/Byline\.tsx$/, // composed into every featured/product card
];

/**
 * Per-surface mapping: changed-file regex → spec file(s) and optional
 * `--grep` patterns. Multiple matches accumulate without duplication.
 */
const MAPPINGS = [
  // Featured / product card components → all three specs render them.
  {
    match: /^src\/components\/cards\/(Course|Book)Card\.tsx$/,
    specs: [
      "e2e/visual-regression.spec.ts",
      "e2e/featured-cards-byline.spec.ts",
      "e2e/card-height-stability.spec.ts",
    ],
  },
  // Skeleton components — featured + product card stability specs.
  {
    match: /^src\/components\/(FeaturedCardSkeleton|ProductCardSkeleton)\.tsx$/,
    specs: [
      "e2e/featured-cards-byline.spec.ts",
      "e2e/card-height-stability.spec.ts",
      "e2e/visual-regression.spec.ts",
    ],
  },
  // Homepage / index hero / mobile carousel — visual + featured-byline.
  {
    match:
      /^src\/(pages\/Index\.tsx|components\/(HeroBanner|MobileCarousel|FeaturedImage)\.tsx)$/,
    specs: [
      "e2e/visual-regression.spec.ts",
      "e2e/featured-cards-byline.spec.ts",
    ],
    grep: "Homepage featured sections|byline",
  },
  // Detail pages — only the product-detail visual-regression suite.
  {
    match: /^src\/pages\/(CourseDetail|BookDetail)\.tsx$/,
    specs: ["e2e/visual-regression.spec.ts"],
    grep: "Product detail",
  },
  // Layout chrome (header / footer / route transition) → only the homepage
  // suite, since detail pages don't snapshot full-page chrome.
  {
    match: /^src\/components\/(layout\/.*|RouteTransition)\.tsx$/,
    specs: ["e2e/visual-regression.spec.ts"],
    grep: "Homepage featured sections",
  },
];

const tripwireHit = changed.find((f) => TRIPWIRES.some((re) => re.test(f)));
if (tripwireHit) {
  dbg(`tripwire hit: ${tripwireHit} → running ALL specs`);
  process.stdout.write("ALL\n");
  process.exit(0);
}

const specSet = new Set();
const grepParts = new Set();
for (const file of changed) {
  for (const m of MAPPINGS) {
    if (m.match.test(file)) {
      for (const s of m.specs) specSet.add(s);
      if (m.grep) grepParts.add(m.grep);
      dbg(`match: ${file} → ${m.specs.join(", ")}${m.grep ? ` (grep: ${m.grep})` : ""}`);
    }
  }
}

if (specSet.size === 0) {
  dbg("no visual surfaces affected — emitting SKIP");
  process.stdout.write("SKIP\n");
  process.exit(0);
}

// Build the `playwright test` argv suffix. Use single quotes around the
// grep alternation so the shell doesn't try to glob it.
const parts = [...specSet];
if (grepParts.size > 0) {
  // If specs were selected via different mappings, NOT every spec will have a
  // matching grep. Only narrow with --grep when at least one mapping
  // requested it AND every selected spec was reached via a grep-bearing
  // mapping (otherwise we'd accidentally drop non-grepped specs' tests).
  const anyGreplessSpec = [...specSet].some((s) => {
    return ![...MAPPINGS].some(
      (m) =>
        m.grep && m.specs.includes(s) && changed.some((f) => m.match.test(f)),
    );
  });
  if (!anyGreplessSpec) {
    parts.push(`--grep`, `'(${[...grepParts].join("|")})'`);
  } else {
    dbg("mixed grep / non-grep selections — running selected specs in full");
  }
}

process.stdout.write(parts.join(" ") + "\n");