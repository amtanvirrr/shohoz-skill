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

const reportPath = process.argv[2] || "vitest-report.json";
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

const write = (md) => {
  if (summaryPath) appendFileSync(summaryPath, md);
  else process.stdout.write(md);
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

const parseMismatch = (message) => {
  // Matches the structured error thrown by expectAllTokens / expectContainsToken
  // in src/components/__tests__/cardLayoutStability.test.tsx.
  const re =
    /TOKEN_MISMATCH source="([^"]+)" token="([^"]+)"\s*\n\s*expected:\s*([^\n]+)\n\s*actual:\s*([^\n]+)/;
  const m = message.match(re);
  if (!m) return null;
  return { source: m[1], token: m[2], expected: m[3].trim(), actual: m[4].trim() };
};

let md = `## Card layout stability — ❌ ${failures.length} failure(s)\n\n`;
md += `The card style token contract (see \`docs/card-style-tokens.md\`) drifted. `;
md += `Restore the listed tokens or update both the cards and matching skeletons together.\n\n`;
md += `| Test | Source | Missing token | Expected | Actual |\n`;
md += `| --- | --- | --- | --- | --- |\n`;

const unstructured = [];
for (const f of failures) {
  const parsed = parseMismatch(f.message);
  if (parsed) {
    const actual =
      parsed.actual.length > 80 ? parsed.actual.slice(0, 77) + "…" : parsed.actual;
    md += `| ${f.name} | \`${parsed.source}\` | \`${parsed.token}\` | \`${parsed.expected}\` | \`${actual}\` |\n`;
  } else {
    unstructured.push(f);
  }
}

if (unstructured.length) {
  md += `\n### Other failures\n\n`;
  for (const f of unstructured) {
    md += `<details><summary>${f.name}</summary>\n\n\`\`\`\n${f.message}\n\`\`\`\n\n</details>\n`;
  }
}

write(md);