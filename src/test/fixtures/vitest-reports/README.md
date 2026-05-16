# Vitest report fixtures

Real-world JSON shapes produced by `bunx vitest run --reporter=json` across
the versions we've encountered in CI. The card-layout summary script must
keep extracting `TOKEN_MISMATCH` entries from all of these so a vitest
upgrade doesn't silently break PR check annotations.

| Fixture | Shape | Notes |
| --- | --- | --- |
| `jest-compatible.json` | `testResults[].assertionResults[]` | Default Jest-compatible reporter output (vitest ≤ 1.x). |
| `task-tree.json` | `files[].tasks[].tasks[]` with `result.state` + `result.errors` | Native vitest task tree (vitest ≥ 2.x). |
| `nested-suites.json` | `testResults[].suites[].tests[]` | Older nested-suites variant some CI configs still emit. |
| `batched-mismatches.json` | Single `failureMessages` entry with multiple `TOKEN_MISMATCH` blocks | Mirrors `expectAllTokens` collecting every drift before throwing. |
| `malformed.json` | Truncated JSON | Forces the raw-text fallback scanner to recover. |
| `garbage.json` | Not JSON at all | Worst-case: the report file got clobbered but still contains a complete TOKEN_MISMATCH block; raw scanner must recover. |
| `truncated-mid-block.json` | JSON truncated mid-TOKEN_MISMATCH | Only the *complete* first block must be recovered; the half-written one must NOT produce a row. |
| `unknown-field.json` | TOKEN_MISMATCH buried in an unrecognised JSON field | Walker won't find a failure node, raw scanner still picks it up. |
| `dedup.json` | Identical TOKEN_MISMATCH appears in BOTH a structured failure and the surrounding raw text | Raw-text fallback must dedupe against structured hits so the row appears exactly once. |

If a future vitest upgrade emits a new shape, drop the new report in here
and extend `src/test/cardLayoutSummary.test.ts` with a matching case.