#!/usr/bin/env node
/**
 * Regenerates the expected card-style token snapshot at
 *   src/components/__tests__/__snapshots__/cardStyleTokens.json
 * by parsing src/lib/cardStyles.ts.
 *
 * Usage:
 *   bun run scripts/update-card-style-snapshots.mjs            # dry-run (diff)
 *   bun run scripts/update-card-style-snapshots.mjs --write    # rewrite snapshot
 *   bun run scripts/update-card-style-snapshots.mjs --write --write-skeleton
 *                                                              # also re-derive
 *                                                              # the SKELETON
 *                                                              # section from
 *                                                              # ProductCardSkeleton.tsx
 *   bun run scripts/update-card-style-snapshots.mjs --check-only
 *                                                              # CI mode: never
 *                                                              # writes, prints
 *                                                              # a compact
 *                                                              # single-line-per-
 *                                                              # field diff,
 *                                                              # disables ANSI
 *                                                              # color so logs
 *                                                              # stay readable.
 *
 * Safety:
 *   - Dry-run is the default. Exits 0 when in sync, 1 when drifted (CI-ready).
 *   - --write requires the explicit flag — typos / accidental runs cannot
 *     silently rewrite the contract.
 *   - --check-only is mutually exclusive with --write / --write-skeleton.
 *     It guarantees the script touches no files (safe for read-only CI
 *     environments) and emits a compact diff format intended for grep-ability
 *     in GitHub Actions log output.
 *   - SKELETON placeholder widths live in src/components/ProductCardSkeleton.tsx,
 *     NOT in cardStyles.ts. By default they're preserved from the previous
 *     snapshot to avoid accidental drift. Pass `--write-skeleton` (alongside
 *     `--write`) to explicitly re-derive them from the skeleton component.
 *     This is an opt-in flag because skeleton widths are a visual contract
 *     reviewers usually want to eyeball before accepting.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "src/lib/cardStyles.ts");
const SKELETON_SRC = resolve(ROOT, "src/components/ProductCardSkeleton.tsx");
const SNAPSHOT = resolve(
  ROOT,
  "src/components/__tests__/__snapshots__/cardStyleTokens.json",
);

const WRITE = process.argv.includes("--write") || process.argv.includes("-w");
const WRITE_SKELETON = process.argv.includes("--write-skeleton");
const CHECK_ONLY = process.argv.includes("--check-only");

if (WRITE_SKELETON && !WRITE) {
  console.error(
    "\x1b[31m✗\x1b[0m --write-skeleton requires --write. " +
      "Run with both flags to re-derive the SKELETON section.",
  );
  process.exit(2);
}

if (CHECK_ONLY && (WRITE || WRITE_SKELETON)) {
  console.error(
    "\x1b[31m✗\x1b[0m --check-only cannot be combined with --write / --write-skeleton.",
  );
  process.exit(2);
}

// Disable ANSI color in --check-only so CI log scrapers / grep stay clean.
const COLOR = !CHECK_ONLY;
const RED = COLOR ? "\x1b[31m" : "";
const GREEN = COLOR ? "\x1b[32m" : "";
const DIM = COLOR ? "\x1b[2m" : "";
const RESET = COLOR ? "\x1b[0m" : "";

/** Extract the string literal assigned to `export const NAME = "...";`. */
function extractClass(source, name) {
  const re = new RegExp(`export const ${name}\\s*=\\s*"([^"]+)"`, "m");
  const m = source.match(re);
  if (!m) throw new Error(`Could not find export const ${name} in cardStyles.ts`);
  return m[1];
}

/** Pull tokens of a given prefix (min-h, leading, line-clamp) out of a class string. */
function tokensMatching(cls, prefix) {
  // Matches `prefix-…` and `<bp>:prefix-…` where bp ∈ {sm,md,lg,xl,2xl}.
  const re = new RegExp(
    `(?:^|\\s)((?:sm:|md:|lg:|xl:|2xl:)?${prefix}-(?:\\[[^\\]]+\\]|[\\w./\\-]+))`,
    "g",
  );
  const out = [];
  let m;
  while ((m = re.exec(cls)) !== null) out.push(m[1]);
  return out;
}

/**
 * Extract font-size tokens only — NOT color tokens. Tailwind shares the
 * `text-` prefix between sizes (`text-xs`, `text-[10px]`) and colors
 * (`text-card-foreground`, `text-muted-foreground/90`), so we need a
 * size-specific whitelist. Matches the named scale (xs..9xl, base) and
 * arbitrary `[…]` values, with optional breakpoint prefix.
 */
function fontSizeTokens(cls) {
  const named = "xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl";
  const re = new RegExp(
    `(?:^|\\s)((?:sm:|md:|lg:|xl:|2xl:)?text-(?:${named}|\\[[^\\]]+\\]))(?=\\s|$)`,
    "g",
  );
  const out = [];
  let m;
  while ((m = re.exec(cls)) !== null) out.push(m[1]);
  return out;
}

/**
 * Extract padding utilities (`p-`, `px-`, `py-`, `pt-`, `pr-`, `pb-`, `pl-`)
 * with optional breakpoint prefix. Returns [] if the token doesn't carry
 * any padding — that's still a contract value worth locking (it means "this
 * class is not allowed to grow padding").
 */
function paddingTokens(cls) {
  const re = new RegExp(
    `(?:^|\\s)((?:sm:|md:|lg:|xl:|2xl:)?p[xytrbl]?-(?:\\[[^\\]]+\\]|[\\w./\\-]+))`,
    "g",
  );
  const out = [];
  let m;
  while ((m = re.exec(cls)) !== null) out.push(m[1]);
  return out;
}

/**
 * Re-derive the SKELETON section from ProductCardSkeleton.tsx by extracting
 * every `skeleton-shimmer h-N w-X` placeholder in source order. The first
 * shimmer is the title bar; the second is the price bar. If the component
 * ever grows more placeholders the order convention must be kept in sync.
 */
function extractSkeletonTokens() {
  if (!existsSync(SKELETON_SRC)) {
    throw new Error(`Cannot find ${SKELETON_SRC} to derive SKELETON tokens`);
  }
  const src = readFileSync(SKELETON_SRC, "utf8");
  // Capture the h-* and w-* utilities sitting on the same className as
  // `skeleton-shimmer`. We deliberately ignore `rounded` and color tokens.
  const re = /skeleton-shimmer\s+(h-[\w./\-]+)\s+(w-[\w./\-]+)/g;
  const hits = [];
  let m;
  while ((m = re.exec(src)) !== null) hits.push(`${m[1]} ${m[2]}`);
  if (hits.length < 2) {
    throw new Error(
      `Expected at least 2 \`skeleton-shimmer h-… w-…\` placeholders in ` +
        `ProductCardSkeleton.tsx, found ${hits.length}. Update the convention ` +
        `or the regex.`,
    );
  }
  return { titleBar: hits[0], priceBar: hits[1] };
}

const source = readFileSync(SRC, "utf8");

const previous = existsSync(SNAPSHOT)
  ? JSON.parse(readFileSync(SNAPSHOT, "utf8"))
  : {};

const skeleton = WRITE_SKELETON
  ? extractSkeletonTokens()
  : previous.SKELETON ?? { titleBar: "h-5 w-4/5", priceBar: "h-6 w-20" };

/**
 * Build the full token map for a given exported constant. We lock the
 * layout-affecting Tailwind utilities only:
 *   - minHeight   (CLS contract)
 *   - leading     (line-box height contract)
 *   - clamp       (line count → required min-height)
 *   - fontSize    (affects natural line-height → affects skeleton sizing)
 *   - padding     (affects card content box)
 *   - tracking    (letter-spacing; affects horizontal text fit + width)
 * Color, hover, transition, and font-family utilities are intentionally
 * EXCLUDED — they don't shift layout, so churning the snapshot on a color
 * tweak would add noise without catching real regressions.
 */
function tokenMap(name) {
  const cls = extractClass(source, name);
  return {
    minHeight: tokensMatching(cls, "min-h"),
    leading: tokensMatching(cls, "leading"),
    clamp: tokensMatching(cls, "line-clamp"),
    fontSize: fontSizeTokens(cls),
    padding: paddingTokens(cls),
    tracking: tokensMatching(cls, "tracking"),
  };
}

const next = {
  $schema:
    "Generated by scripts/update-card-style-snapshots.mjs — do not edit by hand. " +
    "Run `bun run scripts/update-card-style-snapshots.mjs --write` after an intentional cardStyles.ts change.",
  BYLINE_LAYOUT_CLASS: tokenMap("BYLINE_LAYOUT_CLASS"),
  CARD_TITLE_CLASS: tokenMap("CARD_TITLE_CLASS"),
  CARD_DESCRIPTION_CLASS: tokenMap("CARD_DESCRIPTION_CLASS"),
  // Skeleton placeholders don't live in cardStyles.ts. By default we preserve
  // the previous values so this script can't silently mutate them; pass
  // `--write-skeleton` to re-derive from ProductCardSkeleton.tsx in source
  // order (1st shimmer = titleBar, 2nd = priceBar). Keep
  // FeaturedCardSkeleton.tsx in lockstep when widths change.
  SKELETON: skeleton,
};

const previousJson = JSON.stringify(previous, null, 2);
const nextJson = JSON.stringify(next, null, 2) + "\n";

if (previousJson === nextJson.trimEnd()) {
  console.log(
    CHECK_ONLY
      ? "card-style-snapshot: OK (in sync with cardStyles.ts)"
      : `${GREEN}✓${RESET} Card style token snapshot is up to date.`,
  );
  process.exit(0);
}

// Build a diff of the changed fields. In --check-only mode we emit a single
// compact line per field ("key: <prev> -> <next>") so a CI log entry like
// "card-style-snapshot DRIFT: 2 field(s) out of sync" is followed by
// grep-friendly one-liners. Otherwise we use the multi-line colored diff.
const changedKeys = [];
const diff = [];
for (const key of Object.keys(next)) {
  if (key === "$schema") continue;
  const a = JSON.stringify(previous[key] ?? null);
  const b = JSON.stringify(next[key]);
  if (a !== b) {
    changedKeys.push(key);
    if (CHECK_ONLY) {
      diff.push(`  ${key}: ${a} -> ${b}`);
    } else {
      diff.push(`  ${key}`);
      diff.push(`    ${RED}- ${a}${RESET}`);
      diff.push(`    ${GREEN}+ ${b}${RESET}`);
    }
  }
}

if (CHECK_ONLY) {
  console.error(
    `card-style-snapshot DRIFT: ${changedKeys.length} field(s) out of sync ` +
      `[${changedKeys.join(", ")}]`,
  );
  console.error(diff.join("\n"));
  console.error(
    "fix: bun run scripts/update-card-style-snapshots.mjs --write",
  );
  process.exit(1);
}

if (!WRITE) {
  console.error(`${RED}✗${RESET} Card style token snapshot is OUT OF SYNC with src/lib/cardStyles.ts:`);
  console.error(diff.join("\n"));
  console.error(
    `\n${DIM}To accept these changes:${RESET}  ` +
      `bun run scripts/update-card-style-snapshots.mjs --write`,
  );
  console.error(
    `${DIM}Remember to update FeaturedCardSkeleton / ProductCardSkeleton if reserved heights changed.${RESET}`,
  );
  process.exit(1);
}

writeFileSync(SNAPSHOT, nextJson);
console.log(`${GREEN}✓${RESET} Wrote ${SNAPSHOT.replace(ROOT + "/", "")}`);
console.log(diff.join("\n"));
if (WRITE_SKELETON) {
  console.log(
    `${DIM}Re-derived SKELETON from ProductCardSkeleton.tsx:${RESET} ` +
      `titleBar=${skeleton.titleBar}, priceBar=${skeleton.priceBar}`,
  );
}
console.log(
  `\n${DIM}Next:${RESET} run \`bunx vitest run src/components/__tests__/cardLayoutStability.test.tsx\` ` +
    `to confirm the cards + skeletons still match the new contract.`,
);