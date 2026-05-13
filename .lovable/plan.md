## Problem

On mobile, the bottom navigation bar:
- Sits below the footer instead of floating above the page.
- Disappears when scrolled to the top of the page.

## Root cause

`MobileBottomNav` uses `position: fixed`, which should anchor it to the viewport. But it's rendered inside `<Layout>`, which is rendered inside `<RouteTransition>` in `src/App.tsx`.

`RouteTransition` applies the `.route-fade-in` class, whose keyframes animate `transform: translateY(...)` with `animation-fill-mode: both`. That keeps a `transform` value on the wrapper **after** the animation ends. Per CSS spec, any non-`none` `transform` on an ancestor creates a new containing block, so `position: fixed` resolves to that wrapper instead of the viewport. The nav then behaves like a normal block flowing after the footer.

## Fix

Render `MobileBottomNav` outside the `RouteTransition` wrapper so no transformed ancestor exists above it.

### Changes

1. **`src/components/layout/Layout.tsx`** — remove `<MobileBottomNav />` from inside the layout tree.
2. **`src/App.tsx`** — render `<MobileBottomNav />` once, as a sibling of `<RouteTransition>`, inside `<BrowserRouter>` so it still has access to `useLocation`/`Link`. It should not render on admin routes; gate it with a small wrapper that hides itself when `location.pathname.startsWith("/admin")`.

### Hardening (small, in the same file)

3. **`src/components/layout/MobileBottomNav.tsx`** — keep the existing `fixed bottom-0 left-0 right-0 z-50` plus `env(safe-area-inset-bottom)`, and add `will-change: transform` is **not** needed; instead ensure no parent reintroduces a transform. No other change required.

The `pb-20 md:pb-0` spacer already on `<main>` in `Layout.tsx` continues to reserve space so footer content isn't hidden behind the nav.

## Acceptance

- Bottom nav is visible at the top of the page on mobile.
- Bottom nav stays pinned to the viewport while scrolling, including over the footer.
- Bottom nav does not appear on `/admin/*` routes.
- Desktop is unaffected (`md:hidden`).
