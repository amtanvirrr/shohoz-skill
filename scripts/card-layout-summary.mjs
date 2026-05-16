#!/usr/bin/env node
/**
 * Post-processes the vitest JSON report for the card layout stability suite
 * and writes a Markdown summary to $GITHUB_STEP_SUMMARY so PR reviewers can
 * see exactly which token/class mismatched and the expected vs actual values
 * without scrolling through raw test logs.
 *
 * Inputs:
 *   argv[2] — path to the vitest JSON report (default: vitest-report.json)
 * Outputs:
 *   Appends Markdown to $GITHUB_STEP_SUMMARY (or stdout when not in CI).
 */
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/**
 * Build a docs deep-link. In GitHub Actions we have the repo + commit SHA, so
 * we link to the exact file on the PR's commit; locally we fall back to a
 * repo-relative path that still works in many Markdown renderers.
 */
const DOCS_PATH = "docs/card-style-tokens.md";
const docsUrl = (anchor) => {
  const server = process.env.GITHUB_SERVER_URL;
  const repo = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  const frag = anchor ? `#${anchor}` : "";
  if (server && repo && sha) return `${server}/${repo}/blob/${sha}/${DOCS_PATH}${frag}`;
  return `${DOCS_PATH}${frag}`;
};

/** Map TOKEN_MISMATCH `source` → anchor in docs/card-style-tokens.md. */
const sourceToDocsAnchor = (source) => {
  if (/^BYLINE_LAYOUT_CLASS|^bylineClass\(|^<Byline>/.test(source)) return "byline-layout-class";
  if (/^CARD_TITLE_CLASS|<h3>/.test(source)) return "card-title-class";
  if (/^CARD_DESCRIPTION_CLASS|description/.test(source)) return "card-description-class";
  if (/Skeleton/.test(source)) return "price-row";
  return "tokens";
};

const reportPath = process.argv[2] || "vitest-report.json";
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

const write = (md) => {
  if (summaryPath) appendFileSync(summaryPath, md);
  else process.stdout.write(md);
};

/**
 * Emit a GitHub workflow command that renders an inline annotation on the
 * PR's "Files changed" diff at file:line. See
 * https://docs.github.com/actions/using-workflows/workflow-commands-for-github-actions
 */
const annotate = ({ file, line, title, message }) => {
  const esc = (s) =>
    String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  process.stdout.write(
    `::error file=${file},line=${line},title=${esc(title)}::${esc(message)}\n`,
  );
};

/** Map TOKEN_MISMATCH `source` → file that owns the offending class. */
const SOURCE_FILE_MAP = [
  { match: /^BYLINE_LAYOUT_CLASS|^bylineClass\(/, file: "src/lib/cardStyles.ts", needle: "export const BYLINE_LAYOUT_CLASS" },
  { match: /^CARD_TITLE_CLASS/, file: "src/lib/cardStyles.ts", needle: "export const CARD_TITLE_CLASS" },
  { match: /^CARD_DESCRIPTION_CLASS/, file: "src/lib/cardStyles.ts", needle: "export const CARD_DESCRIPTION_CLASS" },
  { match: /^<Byline>/, file: "src/components/Byline.tsx", needle: "BYLINE_LAYOUT_CLASS" },
  { match: /^FeaturedCardSkeleton/, file: "src/components/FeaturedCardSkeleton.tsx", needle: null },
  { match: /^ProductCardSkeleton/, file: "src/components/ProductCardSkeleton.tsx", needle: null },
  { match: /^CourseCard/, file: "src/components/cards/CourseCard.tsx", needle: "CARD_TITLE_CLASS" },
  { match: /^BookCard/, file: "src/components/cards/BookCard.tsx", needle: "CARD_TITLE_CLASS" },
];

const findLine = (relPath, needle) => {
  try {
    const abs = resolve(ROOT, relPath);
    if (!existsSync(abs) || !needle) return 1;
    const lines = readFileSync(abs, "utf8").split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) if (lines[i].includes(needle)) return i + 1;
    return 1;
  } catch {
    return 1;
  }
};

const locateSource = (source) => {
  for (const entry of SOURCE_FILE_MAP) {
    if (entry.match.test(source)) {
      return { file: entry.file, line: findLine(entry.file, entry.needle) };
    }
  }
  return {
    file: "src/components/__tests__/cardLayoutStability.test.tsx",
    line: 1,
  };
};

if (!existsSync(reportPath)) {
  write(`## Card layout stability\n\n⚠️ No vitest report found at \`${reportPath}\`.\n`);
  process.exit(0);
}

const rawReport = readFileSync(reportPath, "utf8");
let report;
try {
  report = JSON.parse(rawReport);
} catch {
  // Even if the JSON is malformed/truncated, we can still salvage mismatches
  // by scanning the raw text below.
  report = null;
}

/**
 * Resilient extractor: vitest's JSON shape has changed across versions and
 * may change again (testResults / files / tasks / suites, assertionResults /
 * tests / tasks, failureMessages / errors / result.errors, status "failed" vs
 * state "fail" vs ok=false). Instead of hard-coding one shape, deep-walk every
 * object and collect any node that looks like a failed test.
 */
const FAIL_STATUSES = new Set(["failed", "fail"]);
const NAME_KEYS = ["fullName", "name", "title", "id"];
const MSG_ARRAY_KEYS = ["failureMessages"];
const ERROR_ARRAY_KEYS = ["errors", "failureDetails"];
const CHILD_ARRAY_KEYS = [
  "testResults", "assertionResults", "tests", "tasks", "suites", "children", "files",
];

const looksLikeFailure = (node) => {
  if (!node || typeof node !== "object") return false;
  if (FAIL_STATUSES.has(node.status)) return true;
  if (FAIL_STATUSES.has(node.state)) return true;
  if (FAIL_STATUSES.has(node?.result?.state)) return true;
  if (node.ok === false && (node.errors?.length || node.failureMessages?.length)) return true;
  return false;
};

const extractName = (node) => {
  for (const k of NAME_KEYS) if (typeof node?.[k] === "string" && node[k]) return node[k];
  return "(unnamed)";
};

const extractMessage = (node) => {
  const parts = [];
  for (const k of MSG_ARRAY_KEYS) {
    if (Array.isArray(node?.[k])) parts.push(...node[k].filter(Boolean));
  }
  for (const k of ERROR_ARRAY_KEYS) {
    const arr = node?.[k];
    if (Array.isArray(arr)) {
      for (const e of arr) {
        if (!e) continue;
        if (typeof e === "string") parts.push(e);
        else if (e.message) parts.push(e.message + (e.stack ? `\n${e.stack}` : ""));
      }
    }
  }
  if (node?.result?.errors) parts.push(...extractMessage({ errors: node.result.errors }).split("\n").filter(Boolean));
  return parts.join("\n");
};

const failures = [];
const seen = new WeakSet();
const visit = (node) => {
  if (!node || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const child of node) visit(child);
    return;
  }
  if (looksLikeFailure(node)) {
    failures.push({ name: extractName(node), message: extractMessage(node) });
  }
  // Recurse into known child arrays first (cheap), then any other nested object.
  for (const k of CHILD_ARRAY_KEYS) if (node[k]) visit(node[k]);
  for (const v of Object.values(node)) {
    if (v && typeof v === "object") visit(v);
  }
};
if (report) visit(report);

/**
 * Last-resort fallback: scan the raw report text for TOKEN_MISMATCH blocks
 * the structured walker missed (unknown JSON shape, malformed JSON, or
 * mismatches buried in fields we didn't recognise). Anything found here is
 * surfaced under a synthetic "(unattributed)" failure so reviewers still see
 * the drift.
 */
(() => {
  const re =
    /TOKEN_MISMATCH source="([^"]+)" token="([^"]+)"\s*\n\s*expected:\s*([^\n]+)\n\s*actual:\s*([^\n]+)/g;
  const seenKeys = new Set(
    failures.flatMap((f) =>
      [...f.message.matchAll(re)].map((m) => `${m[1]}::${m[2]}`),
    ),
  );
  const orphans = [];
  let m;
  while ((m = re.exec(rawReport)) !== null) {
    const key = `${m[1]}::${m[2]}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    orphans.push(m[0]);
  }
  if (orphans.length) {
    failures.push({
      name: "(unattributed — recovered from raw report)",
      message: orphans.join("\n---\n"),
    });
  }
})();

if (failures.length === 0) {
  write(`## Card layout stability\n\n✅ All token/class contracts hold.\n`);
  process.exit(0);
}

/**
 * A single failure message can contain MULTIPLE TOKEN_MISMATCH blocks now
 * (expectAllTokens collects every missing token before throwing). Return them
 * all so the summary lists each drifted token on its own row.
 */
const parseMismatches = (message) => {
  const re =
    /TOKEN_MISMATCH source="([^"]+)" token="([^"]+)"\s*\n\s*expected:\s*([^\n]+)\n\s*actual:\s*([^\n]+)/g;
  const out = [];
  let m;
  while ((m = re.exec(message)) !== null) {
    out.push({
      source: m[1],
      token: m[2],
      expected: m[3].trim(),
      actual: m[4].trim(),
    });
  }
  return out;
};

let md = `## Card layout stability — ❌ ${failures.length} failing test(s)\n\n`;
md += `The card style token contract (see \`docs/card-style-tokens.md\`) drifted. `;
md += `Restore the listed tokens or update both the cards and matching skeletons together.\n\n`;
md += `| Test | Source | Missing token | Expected | Actual | Location | Docs |\n`;
md += `| --- | --- | --- | --- | --- | --- | --- |\n`;

const unstructured = [];
let mismatchCount = 0;
for (const f of failures) {
  const parsedAll = parseMismatches(f.message);
  if (parsedAll.length > 0) {
    for (const parsed of parsedAll) {
      mismatchCount++;
      const actual =
        parsed.actual.length > 80 ? parsed.actual.slice(0, 77) + "…" : parsed.actual;
      const loc = locateSource(parsed.source);
      const anchor = sourceToDocsAnchor(parsed.source);
      const docs = docsUrl(anchor);
      md += `| ${f.name} | \`${parsed.source}\` | \`${parsed.token}\` | \`${parsed.expected}\` | \`${actual}\` | \`${loc.file}:${loc.line}\` | [${anchor}](${docs}) |\n`;
      annotate({
        file: loc.file,
        line: loc.line,
        title: `Card layout token missing: ${parsed.token}`,
        message:
          `${f.name}\n` +
          `Source: ${parsed.source}\n` +
          `Expected token: ${parsed.expected}\n` +
          `Actual: ${actual}\n` +
          `See ${docs} — update cards AND skeletons together.`,
      });
    }
  } else {
    unstructured.push(f);
    annotate({
      file: "src/components/__tests__/cardLayoutStability.test.tsx",
      line: 1,
      title: `Card layout test failed: ${f.name}`,
      message: f.message.slice(0, 500),
    });
  }
}

if (mismatchCount > 0) {
  md += `\n_${mismatchCount} mismatched token(s) across ${failures.length} failing test(s)._\n`;
}

if (unstructured.length) {
  md += `\n### Other failures\n\n`;
  for (const f of unstructured) {
    md += `<details><summary>${f.name}</summary>\n\n\`\`\`\n${f.message}\n\`\`\`\n\n</details>\n`;
  }
}

write(md);