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
const FEATURED_SKELETON_SRC = resolve(
  ROOT,
  "src/components/FeaturedCardSkeleton.tsx",
);
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

/**
 * Compute the 1-based line number for a character offset into `source`.
 */
function lineOfOffset(source, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source.charCodeAt(i) === 10) line++;
  }
  return line;
}

/**
 * Make a `path:line` annotation relative to the repo root so CI logs and
 * editors can click straight through to the offending source line.
 */
function srcRef(absPath, line) {
  return `${absPath.replace(ROOT + "/", "")}:${line}`;
}

/**
 * Extract the string literal assigned to `export const NAME = "...";`,
 * plus the absolute character offset where the literal begins so callers can
 * compute per-token line numbers.
 */
function extractClass(source, name) {
  const re = new RegExp(`export const ${name}\\s*=\\s*"([^"]+)"`, "m");
  const m = re.exec(source);
  if (!m) throw new Error(`Could not find export const ${name} in cardStyles.ts`);
  // m.index points at `export`; the opening quote sits after the `=`.
  const quoteOffset = source.indexOf('"', m.index);
  return { value: m[1], offset: quoteOffset + 1, declLine: lineOfOffset(source, m.index) };
}

/**
 * Run a token-extraction regex against the class string and return
 * `[{ token, line }]` so we can annotate each token with the exact source
 * line in cardStyles.ts (not just the line of the `export const` declaration).
 */
function runRegex(source, cls, classOffset, re) {
  const out = [];
  let m;
  while ((m = re.exec(cls)) !== null) {
    // m.index is the start of the leading whitespace boundary; advance past
    // it so the line lookup points at the token itself, not its delimiter.
    const tokenStart = m.index + (m[0].length - m[1].length);
    out.push({
      token: m[1],
      line: lineOfOffset(source, classOffset + tokenStart),
    });
  }
  return out;
}

/** Pull tokens of a given prefix (min-h, leading, line-clamp) out of a class string. */
function tokensMatching(source, classOffset, cls, prefix) {
  const re = new RegExp(
    `(?:^|\\s)((?:sm:|md:|lg:|xl:|2xl:)?${prefix}-(?:\\[[^\\]]+\\]|[\\w./\\-]+))`,
    "g",
  );
  return runRegex(source, cls, classOffset, re);
}

/**
 * Extract font-size tokens only — NOT color tokens. Tailwind shares the
 * `text-` prefix between sizes (`text-xs`, `text-[10px]`) and colors
 * (`text-card-foreground`, `text-muted-foreground/90`), so we need a
 * size-specific whitelist. Matches the named scale (xs..9xl, base) and
 * arbitrary `[…]` values, with optional breakpoint prefix.
 */
function fontSizeTokens(source, classOffset, cls) {
  const named = "xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl";
  const re = new RegExp(
    `(?:^|\\s)((?:sm:|md:|lg:|xl:|2xl:)?text-(?:${named}|\\[[^\\]]+\\]))(?=\\s|$)`,
    "g",
  );
  return runRegex(source, cls, classOffset, re);
}

/**
 * Extract padding utilities (`p-`, `px-`, `py-`, `pt-`, `pr-`, `pb-`, `pl-`)
 * with optional breakpoint prefix. Returns [] if the token doesn't carry
 * any padding — that's still a contract value worth locking (it means "this
 * class is not allowed to grow padding").
 */
function paddingTokens(source, classOffset, cls) {
  const re = new RegExp(
    `(?:^|\\s)((?:sm:|md:|lg:|xl:|2xl:)?p[xytrbl]?-(?:\\[[^\\]]+\\]|[\\w./\\-]+))`,
    "g",
  );
  return runRegex(source, cls, classOffset, re);
}

/**
 * Re-derive the SKELETON section from ProductCardSkeleton.tsx by extracting
 * every `skeleton-shimmer h-N w-X` placeholder in source order. The first
 * shimmer is the title bar; the second is the price bar. If the component
 * ever grows more placeholders the order convention must be kept in sync.
 */
/**
 * Scan a skeleton component file for every `skeleton-shimmer h-… w-…` (or
 * the pulse-style equivalent `animate-pulse … h-… w-…`) placeholder and
 * return `[{ token, line }]` in source order. The first hit is conventionally
 * the title bar, the second the price bar — keep both skeleton components in
 * lockstep so the convention holds.
 */
function scanSkeletonHits(filePath) {
  if (!existsSync(filePath)) return [];
  const src = readFileSync(filePath, "utf8");
  const re =
    /(?:skeleton-shimmer|animate-pulse)[^"`]*?\b(h-[\w./\-\[\]]+)\s+(?:[\w./\-\[\]:]+\s+)*?(w-[\w./\-\[\]]+)|(w-[\w./\-\[\]]+)\s+(?:[\w./\-\[\]:]+\s+)*?(h-[\w./\-\[\]]+)/g;
  const hits = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const h = m[1] ?? m[4];
    const w = m[2] ?? m[3];
    if (!h || !w) continue;
    hits.push({ token: `${h} ${w}`, line: lineOfOffset(src, m.index), file: filePath });
  }
  return hits;
}

function extractSkeletonTokens() {
  const primary = scanSkeletonHits(SKELETON_SRC);
  if (primary.length < 2) {
    throw new Error(
      `Expected at least 2 \`skeleton-shimmer h-… w-…\` placeholders in ` +
        `${SKELETON_SRC.replace(ROOT + "/", "")}, found ${primary.length}. ` +
        `Update the convention or the regex.`,
    );
  }
  return {
    value: { titleBar: primary[0].token, priceBar: primary[1].token },
    refs: {
      titleBar: srcRef(primary[0].file, primary[0].line),
      priceBar: srcRef(primary[1].file, primary[1].line),
    },
  };
}

const source = readFileSync(SRC, "utf8");

const previous = existsSync(SNAPSHOT)
  ? JSON.parse(readFileSync(SNAPSHOT, "utf8"))
  : {};

const skeletonExtraction = WRITE_SKELETON ? extractSkeletonTokens() : null;
const skeleton =
  skeletonExtraction?.value ??
  previous.SKELETON ?? { titleBar: "h-5 w-4/5", priceBar: "h-6 w-20" };

// Always scan skeleton files so we can annotate SKELETON-section diffs with
// `path:line` refs, even when the user didn't pass --write-skeleton.
const skeletonRefs = (() => {
  if (skeletonExtraction) return skeletonExtraction.refs;
  const refs = {};
  for (const file of [SKELETON_SRC, FEATURED_SKELETON_SRC]) {
    const hits = scanSkeletonHits(file);
    if (!refs.titleBar && hits[0]) refs.titleBar = srcRef(hits[0].file, hits[0].line);
    if (!refs.priceBar && hits[1]) refs.priceBar = srcRef(hits[1].file, hits[1].line);
  }
  return refs;
})();

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
  const { value: cls, offset, declLine } = extractClass(source, name);
  const groups = {
    minHeight: tokensMatching(source, offset, cls, "min-h"),
    leading: tokensMatching(source, offset, cls, "leading"),
    clamp: tokensMatching(source, offset, cls, "line-clamp"),
    fontSize: fontSizeTokens(source, offset, cls),
    padding: paddingTokens(source, offset, cls),
    tracking: tokensMatching(source, offset, cls, "tracking"),
  };
  // Snapshot stays a plain `string[]` per group (no line numbers in the
  // committed JSON — those would churn on every formatting edit). The
  // location index is built separately and used only for diff annotations.
  const tokens = {};
  const locations = {};
  for (const [group, hits] of Object.entries(groups)) {
    tokens[group] = hits.map((h) => h.token);
    locations[group] = Object.fromEntries(
      hits.map((h) => [h.token, srcRef(SRC, h.line)]),
    );
  }
  return { tokens, locations, declRef: srcRef(SRC, declLine) };
}

const maps = {
  BYLINE_LAYOUT_CLASS: tokenMap("BYLINE_LAYOUT_CLASS"),
  CARD_TITLE_CLASS: tokenMap("CARD_TITLE_CLASS"),
  CARD_DESCRIPTION_CLASS: tokenMap("CARD_DESCRIPTION_CLASS"),
};

/**
 * Breakpoint cascade validation
 * ─────────────────────────────────────────────────────────────────────────
 * Tailwind's responsive prefixes are min-width — `sm:min-h-[x]` only kicks
 * in once the viewport hits the `sm` breakpoint, leaving smaller viewports
 * with NO reserved height unless an unprefixed base token is also present.
 * For CLS-sensitive groups (minHeight / leading / clamp / fontSize) we
 * therefore require: if ANY breakpoint-prefixed token exists in the group,
 * an unprefixed base token MUST also exist. Otherwise the smallest
 * viewport has zero reserved layout and the card will jump on data load.
 *
 * Padding / tracking are excluded — they are allowed to be empty groups
 * (the snapshot already records `[]` for them).
 */
const BP_RE = /^(sm|md|lg|xl|2xl):/;
const CASCADE_GROUPS = ["minHeight", "leading", "clamp", "fontSize"];
const cascadeViolations = [];
for (const [name, map] of Object.entries(maps)) {
  for (const group of CASCADE_GROUPS) {
    const tokens = map.tokens[group] ?? [];
    if (tokens.length === 0) continue;
    const hasPrefixed = tokens.some((t) => BP_RE.test(t));
    const hasBase = tokens.some((t) => !BP_RE.test(t));
    if (hasPrefixed && !hasBase) {
      const firstPrefixed = tokens.find((t) => BP_RE.test(t));
      cascadeViolations.push({
        name,
        group,
        tokens,
        ref: map.locations[group]?.[firstPrefixed] ?? map.declRef,
      });
    }
  }
}
if (cascadeViolations.length > 0) {
  console.error(
    `${RED}✗${RESET} Breakpoint cascade violation(s) in src/lib/cardStyles.ts:`,
  );
  for (const v of cascadeViolations) {
    console.error(
      `  ${v.name}.${v.group} has breakpoint-prefixed token(s) ` +
        `but no unprefixed base: [${v.tokens.join(", ")}]`,
    );
    console.error(`    @ ${v.ref}`);
  }
  console.error(
    `${DIM}Fix: add an unprefixed base token (e.g. \`min-h-[…]\`) before the \`sm:\` / \`md:\` variant.${RESET}`,
  );
  process.exit(1);
}

const next = {
  $schema:
    "Generated by scripts/update-card-style-snapshots.mjs — do not edit by hand. " +
    "Run `bun run scripts/update-card-style-snapshots.mjs --write` after an intentional cardStyles.ts change.",
  BYLINE_LAYOUT_CLASS: maps.BYLINE_LAYOUT_CLASS.tokens,
  CARD_TITLE_CLASS: maps.CARD_TITLE_CLASS.tokens,
  CARD_DESCRIPTION_CLASS: maps.CARD_DESCRIPTION_CLASS.tokens,
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
/**
 * Resolve `key`/`group`/`token` back to the source location it originated
 * from. For *_CLASS groups the location comes from the parsed cardStyles.ts
 * offsets; for SKELETON it comes from the skeleton-file scan above. Falls
 * back to the export's declaration line, then to the file path with no line.
 */
function locate(key, group, token) {
  if (key === "SKELETON") return skeletonRefs[group] ?? srcRef(SKELETON_SRC, 1);
  const map = maps[key];
  if (!map) return srcRef(SRC, 1);
  if (token && map.locations[group]?.[token]) return map.locations[group][token];
  return map.declRef;
}

const changedKeys = [];
const diff = [];
for (const key of Object.keys(next)) {
  if (key === "$schema") continue;
  const a = JSON.stringify(previous[key] ?? null);
  const b = JSON.stringify(next[key]);
  if (a !== b) {
    changedKeys.push(key);
    // Emit a per-field annotation pinned to the precise source line that
    // owns the token, so failures point at the *component / class* line
    // rather than just "somewhere in cardStyles.ts".
    const prevVal = previous[key] ?? null;
    const nextVal = next[key];
    const fieldNotes = [];
    if (
      prevVal &&
      typeof prevVal === "object" &&
      !Array.isArray(prevVal) &&
      nextVal &&
      typeof nextVal === "object" &&
      !Array.isArray(nextVal)
    ) {
      // Grouped token map (BYLINE/CARD_TITLE/CARD_DESCRIPTION) or SKELETON.
      const allGroups = new Set([
        ...Object.keys(prevVal),
        ...Object.keys(nextVal),
      ]);
      for (const group of allGroups) {
        const pg = JSON.stringify(prevVal[group] ?? null);
        const ng = JSON.stringify(nextVal[group] ?? null);
        if (pg === ng) continue;
        // For SKELETON each group is a single string; for token maps each
        // group is a string[] — pick the first changed token to anchor the
        // annotation, otherwise fall back to the group itself.
        let anchor;
        if (Array.isArray(nextVal[group])) {
          const prevArr = Array.isArray(prevVal[group]) ? prevVal[group] : [];
          const added = nextVal[group].find((t) => !prevArr.includes(t));
          const removed = prevArr.find((t) => !nextVal[group].includes(t));
          anchor = added ?? removed;
        }
        fieldNotes.push(
          `    @ ${locate(key, group, anchor)}  (${group}${
            anchor ? `: ${anchor}` : ""
          })`,
        );
      }
    } else {
      fieldNotes.push(`    @ ${locate(key)}`);
    }

    if (CHECK_ONLY) {
      diff.push(`  ${key}: ${a} -> ${b}`);
      for (const n of fieldNotes) diff.push(n);
    } else {
      diff.push(`  ${key}`);
      diff.push(`    ${RED}- ${a}${RESET}`);
      diff.push(`    ${GREEN}+ ${b}${RESET}`);
      for (const n of fieldNotes) diff.push(`${DIM}${n}${RESET}`);
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