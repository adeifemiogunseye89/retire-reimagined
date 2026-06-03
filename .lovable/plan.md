## Problem
The hero and bottom CTA sections on `Landing.tsx` use different labels and competing button styles for the same action:

| Section | Label | Style |
|---------|-------|-------|
| Hero | "Start Free Assessment" | `variant="secondary"` + `shadow-gold` |
| Bottom CTA | "Take the Assessment Now" | `gradient-hero` override (more dominant, competes visually) |

Both buttons navigate to `/assessment`. The bottom CTA is visually louder than the hero's, which breaks hierarchy.

## Changes
In `src/pages/Landing.tsx`:

1. **Unify label** — change bottom CTA text from `"Take the Assessment Now"` to `"Start Free Assessment"`.
2. **Unify styling** — switch the bottom button to `variant="secondary"` with `shadow-gold` and `text-base font-heading font-semibold`, matching the hero. Remove the `gradient-hero text-primary-foreground` override.
3. **Preserve icon** — keep the `ArrowRight` icon on the bottom CTA.

## Result
Both CTAs behave as one consistent action: same label, same secondary/emerald style, same destination. The hero remains the primary visual anchor; the bottom CTA acts as a natural re-engagement without stealing attention.

## Files
- `src/pages/Landing.tsx` (single-file edit)