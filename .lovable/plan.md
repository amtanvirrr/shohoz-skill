# Mobile Bottom Nav — Floating Glassmorphism

Redesign `src/components/layout/MobileBottomNav.tsx` into a detached, floating glassmorphic pill with an elevated center "Menu" button. Purely visual — routes, sheet content, auth, and theme logic stay identical.

## Layout

- Container: `fixed bottom-0 left-0 right-0 z-50 md:hidden`, padding `px-4 pb-3` plus `env(safe-area-inset-bottom)`, no border, transparent background. Wraps the bar so it floats above screen edges.
- Bar: `mx-auto max-w-md` pill with `rounded-2xl`, `glass-card` background, `border border-border/40`, soft shadow (`shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.25)]`), `backdrop-blur-xl`.
- Grid: 5 columns, but middle slot (Menu) renders an elevated FAB that overflows upward (`-mt-6`).

## Tabs (4 side items: Home, Courses, Books, Quizzes)

- Vertical stack: icon + label, `py-2.5`, `text-[11px]`.
- Inactive: `text-muted-foreground`.
- Active: `text-primary`, icon sits in subtle `bg-primary/10` rounded square, plus a 4px primary dot indicator below the label (`h-1 w-1 rounded-full bg-primary`).
- Smooth `transition-all duration-200`, `active:scale-95`.

## Center "Menu" FAB

- Circular button, `h-14 w-14 rounded-full`, gradient `bg-gradient-to-br from-primary to-accent`, white icon, `shadow-lg shadow-primary/30`, lifted via `-mt-6`.
- Ring around it: `ring-4 ring-background` so it visually detaches from the bar.
- Opens existing Sheet (no changes to sheet contents).
- When open: subtle pulse / scale (`scale-105`).
- Label "মেনু" stays beneath in same `text-[11px]` style.

## Spacing / safe area

- Keep `env(safe-area-inset-bottom)` padding so it sits above iOS home indicator.
- Verify body bottom-padding still clears the new floating height (~84px including FAB lift). Adjust the existing global mobile bottom padding token in `src/index.css` if needed (only if measurement shows overlap).

## Accessibility & motion

- Preserve `aria-label`s, `SheetTrigger`/`SheetClose` usage.
- Respect `prefers-reduced-motion`: disable scale/pulse transitions.

## Files

- `src/components/layout/MobileBottomNav.tsx` — markup + classnames rewrite only.
- `src/index.css` — only if bottom-padding spacer needs a small bump for the elevated FAB.

## Out of scope

- Sheet menu contents, routing logic, auth, theme toggle behavior — unchanged.
- No new dependencies.
