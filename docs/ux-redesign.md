# UX Redesign — Phase Plan & Status

Goal: make the app read as one product — less crowded screens, one design language,
production polish. Full proposal reviewed with the product owner on 2026-07-02.

**How to work this plan:** each phase is sized to fit one session. Complete a phase,
run `npm test`, push, and check it off here. Next session: read this file and start
the first unchecked phase.

## Phase 1 — Foundation ✅ (done 2026-07-02)
- [x] Design tokens in `app/globals.css` (`--color-brand`, `--gradient-brand`, radii, shadows, `--nav-clearance`, `--page-max-width`)
- [x] Heebo font (Hebrew+Latin) via `next/font`, exposed as `--font-app`
- [x] `prefers-reduced-motion` guard
- [x] Shared components in `components/ui/`: `PageHeader`, `Card`, `Button`, `Sheet`, `ConfirmDialog`, `EmptyState`
- [x] BottomNav: 5 tabs (Home, Tasks, Wallet, Rankings, More), active color = brand token (was blue `#1a56db`)
- [x] `/more` hub page: Family + History/Manage (manager) + Product Admin (gated), language toggle, sign out
- [x] i18n keys: `navMore`, `more*` (en + he); removed hardcoded Hebrew nav label

## Phase 2 — Wallet restructure
- [ ] Default view = summary only: balance hero (with points chip + convert CTA), pending-requests
      badge card, family member list, 5 recent transactions + "view all"
- [ ] Fold adjust-balance into the member detail Sheet (`+ Add / − Deduct` buttons) — remove the
      standalone always-open form with the member dropdown
- [ ] Move recurring payments to its own sub-screen (`/wallet/recurring`) linked from wallet
- [ ] Move rate + min-points settings to a Sheet or sub-screen
- [ ] Remove the separate "all household transactions" card (reachable via member drill-in / view all)
- [ ] Use `PageHeader`, `Card`, `Button`, `Sheet` from `components/ui/`

## Phase 3 — Screen cleanups
- [ ] Home: show points/progress once (hero card only); remove header points pill; move help,
      what's-new, language, sign-out out of the header (they live in /more now)
- [ ] History: one row of range chips + single "Filter" button opening a Sheet; fold summary cards
      into a one-line stat; remove 🐛 debug banner and console.logs
- [ ] Leaderboard: list starts at rank 4 (podium keeps top 3); use PageHeader
- [ ] Users: single "Add member" CTA opening a Sheet with Invite/Create options; card actions
      behind an overflow (⋯) menu
- [ ] Admin: merge the two near-identical modals into one form component; overflow menu on rows;
      translate alert strings
- [ ] Add (Quick Complete): fix success-message color bug (checks for '✅' never present);
      remove the static "Quick Stats" tip card

## Phase 4 — Production polish
- [ ] Replace every `alert()`/`confirm()` with `ConfirmDialog` (translated)
- [ ] Delete dead code: `app/page-old.tsx`, orphaned legacy classes in `globals.css`,
      unused keyframes in leaderboard
- [ ] i18n sweep: any remaining hardcoded strings (admin alert messages)
- [ ] Accessibility: aria-labels on icon buttons, visible delete affordances, contrast pass
- [ ] Align all pages to `--page-max-width` and `PageHeader`

## Conventions (all phases)
- New UI code uses the CSS tokens — no hardcoded hex, no new gradients
- Modals = `Sheet` (bottom sheet); confirmations = `ConfirmDialog`
- Money semantics: green in / red out / amber pending — brand purple for everything else
- `npm test` must pass before any push; master deploys to production
