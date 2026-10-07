# PixivFlow WebUI Agent Guidelines

Standing rules for AI agents, contributors and maintainers working in this
repository. Read before any change; where these disagree with an ad-hoc
instruction, escalate rather than rewrite.

## Project Identity

**pixivflow-webui is the browser front-end of PixivFlow** — the UI for the
PixivFlow download manager. It renders dashboards, download management, file
browsing, log streaming and a configuration editor in the browser.

It ships **UI code only**. The PixivFlow backend (TypeScript CLI + Express
service, 52 REST endpoints and two Socket.IO channels `logs` / `download`)
lives in the separate PixivFlow repository and serves this frontend's built
dist over `STATIC_PATH`.

Dividing line:

```
WebUI     = Presentation / browser interaction
Backend   = Pixiv business logic, API, scheduling, downloads
Desktop   = runtime lifecycle / native distribution (pixivflow-desktop)
```

It is not:

- a place for Pixiv download / scheduling / auth business rules
- a backend or a standalone application
- a second UI maintained inside pixivflow-desktop

## Architecture

```
React 18 + TypeScript + Vite
        |
        +-- REST calls to the PixivFlow backend
        +-- Socket.IO channels: logs, download
        +-- pages: dashboard, downloads, files, logs, settings
        +-- i18n (zh / en)
```

Build = `tsc && vite build`; the built dist is what the backend serves.

## Rules

Allowed:

- React components, hooks, routes, state for displaying backend data
- REST / Socket.IO client interaction with the existing backend contract
- styling, i18n, accessibility, browser-side validation

Must not:

- re-implement backend business rules (scheduling, downloads, Pixiv auth)
- call Pixiv APIs directly or embed Pixiv credentials / tokens
- invent endpoints — follow the backend's published API contract; when the
  contract is missing a field, change PixivFlow first
- break the Socket.IO event contract (`logs`, `download`)

## Device capabilities (desktop host)

Reference: `docs/DESKTOP_HOST.md`; the cross-repo contract is PixivFlow
`docs/platform-contract.md` §4.7.

- **One entry point for the device layer.** Pages and components never test
  `window.pixivflowHost` themselves: go through `src/utils/hostCapabilities.ts`
  (+ `types/host-bridge.d.ts`) and exactly one caller module per capability
  (`revealPath.ts`, `notifications.ts`, `openLink.ts`, …). Adding a capability
  must touch those files and one new caller, never every page.
- **Degrade truthfully.** No host (Docker / NAS / VPS / browser) is a missing
  capability, not a failure: reveal falls back to copying the path, a
  notification falls back to the page, a link opens in a tab. Never render a
  missing capability as an error, and never report success that did not happen
  (a `denied` notification was not shown).
- **Paths come from the backend.** Ask `GET /api/files/location` and use the
  absolute path it returns — never a raw `storage.*Directory` value from the
  config, which is usually relative. The host confines the result to the
  configured download roots before opening anything.
- **Realtime feedback announces transitions, not first snapshots.** The download
  task list's first snapshot is history (database rows merged with in-memory
  tasks), so a listener seeds it as already-announced and only reports what
  happens afterwards — see `useDownloadCompletionNotice`. Do not derive "just
  finished" from list length, poll count, or the newest completed row.

## Compatibility

Public interfaces — treat as versioned contracts:

- the backend REST API and Socket.IO channels this UI consumes
- built-dist serving over `STATIC_PATH`
- configurable API base URL / same-origin deployment

Changes must consider backward compatibility and release notes (release-please
drives the changelog). Coordinate breaking API changes with PixivFlow.

## Development

- Node + ESM; React 18, TypeScript, Vite
- prefer small, incremental changes; evolve, don't replace
- keep bilingual (zh / en) locales and `docs/` in sync with behavior changes
- validate as applicable:
  - `npm run lint` (`--max-warnings 0`)
  - `npm test` (jest)
  - `npm run build` (`tsc && vite build`)
  - e2e guidance: `docs/E2E_TESTING_GUIDE.md`

## Commit Rules

- single-purpose, revertible, accurately described
- no drive-by cleanups or mixed refactors
- conventional-commit style, e.g. `feat: ...`, `fix: ...`, `docs: ...`
