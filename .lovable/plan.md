

# Fix: Landing Page Blank Screen

## Problem
The `useCountdown` hook (line 231) is called **after** two early return statements (lines 141-142). When React renders the component and hits an early return, the hook doesn't get called. On the next render when data is loaded, the hook suddenly gets called, causing a "Rendered more hooks than during the previous render" error and a blank screen.

## Solution
Move the `useCountdown` hook call to **before** the early return statements, alongside the other hooks at the top of the component.

## Technical Details

**File: `src/pages/LandingPage.tsx`**

1. Move line 231 (`const countdown = useCountdown(...)`) to right after the state declarations (after line 113), before the `useEffect` on line 115.
2. Similarly move the computed values on lines 232-233 (`stockRemaining`, `stockPercent`) to after the early returns where they currently are (these are fine since they're not hooks, but the countdown hook must move).

Specifically:
- Add `const countdown = useCountdown(page?.show_countdown ? page?.countdown_end_time : null);` after line 113 (before any early returns)
- Remove the original line 231

This is a one-line move that fixes the blank screen issue.

