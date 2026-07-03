# UX Redesign — Phase Plan & Status

Goal: make the app read as one product — less crowded screens, one design language,
production polish. Full proposal reviewed with the product owner on 2026-07-02.

**How to work this plan:** each phase is sized to fit one session and deploys to
production on completion. Complete a phase, run the pre-deploy checks (tsc, tests,
migrate status, smoke test), merge to master, push, and check it off here.
Next session: read this file and start the first unchecked phase.

## Phase 1 — Foundation ✅ (done 2026-07-02)
- [x] Design tokens in `app/globals.css` (`--color-brand`, `--gradient-brand`, radii, shadows, `--nav-clearance`, `--page-max-width`)
- [x] Heebo font (Hebrew+Latin) via `next/font`, exposed as `--font-app`
- [x] `prefers-reduced-motion` guard
- [x] Shared components in `components/ui/`: `PageHeader`, `Card`, `Button`, `Sheet`, `ConfirmDialog`, `EmptyState`
- [x] BottomNav: 5 tabs (Home, Tasks, Wallet, Rankings, More), active color = brand token (was blue `#1a56db`)
- [x] `/more` hub page: Family + History/Manage (manager) + Product Admin (gated), language toggle, sign out
- [x] i18n keys: `navMore`, `more*` (en + he); removed hardcoded Hebrew nav label

## Phase 2 — Wallet restructure ✅ (done 2026-07-02)
- [x] Default view = summary only: balance hero (points chip + convert CTA + request-money CTA),
      pending-requests card, family member list, 5 recent transactions + "view all" Sheet
- [x] Adjust-balance folded into the member detail Sheet (`+ Credit / − Debit` buttons);
      standalone form removed
- [x] Recurring payments moved to `/wallet/recurring` (manager-only sub-screen)
- [x] Rate + min-points settings moved to a Sheet
- [x] Separate "all household transactions" card removed (manager recent list is household-wide;
      full list in the "view all" Sheet; per-member history in the member Sheet)
- [x] Page rebuilt on `PageHeader`/`Card`/`Button`/`Sheet` + tokens (1148 → ~700 lines)

## Phase 3 — Screen cleanups ✅ (done 2026-07-02)
- [x] Home: header stripped to greeting + subtitle + proxy banner; points pill, language toggle,
      help ❓, what's-new 🎉 and sign-out removed (all live in /more; What's New still auto-shows
      once per version). WelcomeModal + WhatsNewModal now open from /more Settings.
- [x] History: 3 filter dropdowns collapsed into one "Filter" button (with active-count badge)
      opening a Sheet with Clear/Done; 3 summary cards folded into a one-line stat next to it
- [x] History: 🐛 debug banner replaced with translated error banner + Retry; debug console.logs removed
- [x] Leaderboard: list starts at rank 4 when podium shown, section hidden when empty;
      dead bounce/pulse keyframes removed
- [x] Users: single "+ Add member" CTA opening a chooser Sheet (Invite with code / Create manually);
      per-card Edit/Reset/Remove actions collapsed behind a ⋯ toggle
- [x] Admin: alert strings translated (deleted-with-cascade info, errors, image-type warning)
- [x] Add (Quick Complete): success-message color bug fixed; static "Quick Stats" tip card removed

Deferred to Phase 4: Admin modal merge (two near-identical category/activity modals → one form
component) and admin row overflow menus — internal refactor, no schema/API impact.

## Phase 4 — Production polish ✅ (done 2026-07-02)
- [x] All native `alert()`/`confirm()` replaced with styled dialogs via a global
      `ConfirmProvider` (`useConfirm()` → `confirm()` / `alertDialog()`), mounted in Providers.
      Converted: home, admin, users, history, my-tasks, product-admin (~30 call sites)
- [x] Dead code deleted: `app/page-old.tsx`, all orphaned legacy classes + coral palette in
      `globals.css` (now tokens + base only); leaderboard keyframes removed in Phase 3
- [x] i18n: admin alerts translated (Phase 3); dialog default labels localized
- [x] Accessibility: aria-labels on admin ✏️/🗑️ buttons; my-tasks delete ✕ now visible
      (danger chip, 28px target) with aria-label; global `:focus-visible` outline;
      `prefers-reduced-motion` guard (Phase 1)

Remaining (optional, backlog): align every page container to `--page-max-width`/`PageHeader`
(wallet, more, recurring done; home/history/users/admin/leaderboard still use their own
containers), and merge the two admin modals into one form component. Both are internal
consistency refactors with no user-facing risk.

## Conventions (all phases)
- New UI code uses the CSS tokens — no hardcoded hex, no new gradients
- Modals = `Sheet` (bottom sheet); confirmations = `ConfirmDialog`
- Money semantics: green in / red out / amber pending — brand purple for everything else
- `npm test` must pass before any push; master deploys to production
