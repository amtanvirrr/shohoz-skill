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

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const failures = [];

const walk = (results) => {
  for (const r of results ?? []) {
    if (r.status === "failed" || r.state === "fail") {
      const msg =
        r.failureMessages?.join("\n") ??
        r.errors?.map((e) => e.message).join("\n") ??
        "";
      failures.push({ name: r.fullName ?? r.name ?? "(unnamed)", message: msg });
    }
    if (r.assertionResults) walk(r.assertionResults);
  }
};
for (const tr of report.testResults ?? []) walk(tr.assertionResults ?? tr.tests ?? []);

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
md += `| Test | Source | Missing token | Expected | Actual | Location |\n`;
md += `| --- | --- | --- | --- | --- | --- |\n`;

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
      md += `| ${f.name} | \`${parsed.source}\` | \`${parsed.token}\` | \`${parsed.expected}\` | \`${actual}\` | \`${loc.file}:${loc.line}\` |\n`;
      annotate({
        file: loc.file,
        line: loc.line,
        title: `Card layout token missing: ${parsed.token}`,
        message:
          `${f.name}\n` +
          `Source: ${parsed.source}\n` +
          `Expected token: ${parsed.expected}\n` +
          `Actual: ${actual}\n` +
          `See docs/card-style-tokens.md — update cards AND skeletons together.`,
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