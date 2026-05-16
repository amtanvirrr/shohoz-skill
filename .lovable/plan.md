## Problem

Cloudflare deploy runs `bun install --frozen-lockfile` and fails:
```
Outdated lockfile version: failed to parse lockfile: 'bun.lockb'
error: lockfile had changes, but lockfile is frozen
```

The committed `bun.lockb` was produced by an older Bun version that the deploy runner (Bun 1.2.15) can no longer parse, so it falls back to resolving from `package.json` — which `--frozen-lockfile` then rejects.

## Fix

Regenerate the lockfile in the new text format and commit it.

1. Delete the stale `bun.lockb`.
2. Run `bun install` locally in the sandbox to produce a fresh `bun.lock` (Bun 1.2+ text lockfile) matching `package.json`.
3. Verify build still passes (`bunx tsc --noEmit`, `bunx vite build`).
4. The next deploy will find a valid lockfile and `--frozen-lockfile` will succeed.

No source code or dependency versions change — only the lockfile is refreshed.

## Notes

- No `package.json` edits; all resolved versions stay the same.
- If the deploy pipeline is configured for the binary `bun.lockb` specifically, the new `bun.lock` text file is still picked up automatically by Bun 1.2.15.
