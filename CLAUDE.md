# Claude Instructions — alisamadii useSend fork

This repo is Ali's fork of `usesend/useSend`, rebranded to the agency look. The fork's
only purpose is UI/branding — all logic stays identical to upstream so updates merge
cleanly forever.

## Branch model

- `main` — clean mirror of `upstream/main`. Never commit here.
- `agency` — default branch, all fork work lives here.

Upstream update flow:

```sh
git fetch upstream
git checkout main && git merge --ff-only upstream/main
git checkout agency && git merge main   # resolve, smoke test, then tag
```

Tags follow `v<upstream-version>-agency.<n>`; a tag push triggers the Docker publish
workflow to `ghcr.io/alisamadiii/usesend`.

## Hard rules

- **UI only.** Never touch `apps/web/src/server`, `apps/web/src/trpc`,
  `apps/web/prisma`, `packages/lib`, `packages/sdk`, `apps/smtp-server`, or any API
  route logic. If a feature change is wanted, it goes upstream, not here.
- Prefer theme-token changes (`packages/ui/styles/globals.css`) over component edits;
  prefer `packages/ui` edits over per-page edits — upstream churns pages the most.
- No file renames/moves, no formatting-only diffs, no dependency bumps upstream
  doesn't have. Keep every diff small and surgical so merges stay trivial.
- Tailwind classes stay inline on elements — never hoist class strings into consts.
- After every upstream merge: `pnpm build` + click-through smoke test before tagging.

## What this fork changes

- `packages/ui/styles/globals.css` — warm-beige agency theme, AGENCY orange primary,
  variables hold full colors consumed via `var()` (upstream used HSL triplets +
  `hsl(var())`; the one raw usage in `packages/ui/src/sidebar.tsx` was updated).
- Brand assets: `apps/web/public/logo-squircle.png`, `favicon.ico`, `favicon_io/*`.
- Brand strings: `apps/web/src/app/layout.tsx` metadata, `AppSideBar` wordmark,
  login page copy, unsubscribe footer.
- `.github/workflows/publish.yml` — free runners, ghcr only.
- Email templates under `apps/web/src/server/email-templates` still say "useSend"
  (left untouched to honor the no-server-edits rule; revisit deliberately if needed).
