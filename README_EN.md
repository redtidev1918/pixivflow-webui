# PixivFlow WebUI

> **English:** PixivFlow WebUI is the browser front-end of the PixivFlow download manager. The PixivFlow backend — a TypeScript CLI paired with an Express service that serves both REST API and WebUI on port 3000 by default — lives in a separate main repository. This repository ships UI code only and is treated as an optional component of that repo: the backend exposes 52 REST endpoints plus two Socket.IO channels (`logs`, `download`), while this project renders dashboards, download management, file browsing, log streaming and a configuration editor in the browser.

The browser-based management interface for PixivFlow. The PixivFlow core (TypeScript CLI and Express service) is maintained in a separate main repository; this repository contains front-end code only and is used as an optional component of it — the backend provides the REST API and realtime push, this project provides the entire browser-side UI.

## Feature overview

| Feature | Page | Description |
| --- | --- | --- |
| Dashboard stats | `/dashboard` | Overview, download statistics, author and tag distributions (`/api/stats/*`) |
| Task management | `/download` | View task snapshots; start, stop, resume, run-all, random downloads; history and incomplete tasks |
| URL download | `/url-download` | Parse single or batched URLs and submit download tasks |
| File browsing & preview | `/files` | File list, recent files, content preview |
| Download history | `/history` | Browse and delete historical tasks |
| Realtime logs | `/logs` | Incremental log stream pushed over Socket.IO |
| Config editor | `/config` | Grouped forms + JSON editor; validate, back up, repair, save and restore (roll back) configuration history |

All pages except the login page (`/login`) render inside protected routes and require prior authentication.

## Talking to the backend

| Channel | Details |
| --- | --- |
| REST | 52 endpoints under `/api/auth`, `/api/config`, `/api/download`, `/api/stats`, `/api/logs`, `/api/files`; health checks at `/api/health` (alias `/health`) |
| Socket.IO `logs` | Pushes `{ type: 'initial', lines }` right after connect to hydrate, then `{ type: 'new', line }` per appended line |
| Socket.IO `download` | Pushes task snapshots; the payload shape matches the `GET /api/download/status` response |

The full REST reference lives in the main repository's [docs/API.md](https://raw.githubusercontent.com/redtidev1918/PixivFlow/master/docs/API.md).

## Tech stack

| Area | Choice |
| --- | --- |
| UI framework | React 18 · TypeScript · Ant Design 5 · React Router 6 (BrowserRouter) |
| State | TanStack Query v5 (server state) · Zustand (client state) |
| Realtime | socket.io-client |
| i18n | i18next (`zh-CN` / `en-US`) |
| Build | Vite |
| Testing | Jest · React Testing Library · jest-axe (unit) · Playwright (E2E) |

## Repository layout

```
pixivflow-webui/
├── src/
│   ├── components/   # Layout / forms / tables / modals / common
│   ├── pages/        # Dashboard / Config / Download / Files / History / Logs / Login / UrlDownload
│   ├── services/     # axios API clients (api/) and the shared Socket.IO connection (socket.ts)
│   ├── stores/       # Zustand stores (auth / ui)
│   ├── hooks/        # Data-fetching and interaction hooks
│   ├── locales/      # zh-CN.json / en-US.json
│   ├── i18n/         # i18next bootstrap
│   ├── types/        # Shared type definitions
│   └── __tests__/    # Jest unit tests
├── e2e/              # Playwright specs (auth / dashboard / config / download / files / navigation)
├── docs/             # Development, component, E2E and performance guides
├── build/            # Pre-build checks and post-build verification scripts
└── vite.config.ts    # Dev server (5173) with /api and /socket.io proxying (Playwright config: playwright.config.ts)
```

## Getting started

Prerequisites: Node.js 20.19+ or 22.12+ (required by Vite) and a running PixivFlow backend.

Start the backend (the npm package published from the main repository):

```bash
npm install -g pixivflow
pixivflow webui          # listens on http://localhost:3000 by default
```

Start the front-end dev server:

```bash
npm install
npm run dev              # http://localhost:5173; /api and /socket.io are proxied to localhost:3000
```

If the backend runs on a port other than 3000, set the `VITE_DEV_API_PORT` environment variable before `npm run dev`.

Production build:

```bash
npm run build            # tsc type-check + Vite bundle, output in dist/
```

The output is static files with two typical deployments:

1. **Static hosting** (Nginx, CDN, ...): when `VITE_API_BASE_URL` is unset the front-end calls the backend via the relative path `/api`, so reverse-proxy the API onto the same origin and add an SPA fallback (all paths serve `index.html`). For cross-origin setups set `VITE_API_BASE_URL=http://backend-host:3000` at build time.
2. **Packaged with the main repository's Docker image**: the main repo pulls this repository's source automatically during its image build, so no separate deployment is needed.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server (port 5173) |
| `npm run build` | Production build (`tsc && vite build`) |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Jest unit tests |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run unit tests with coverage report |
| `npm run test:e2e` | Run Playwright end-to-end tests (starts the dev server itself; `:headed`/`:debug`/`:report` variants exist) |
| `npm run test:e2e:ui` | Run end-to-end tests in Playwright UI mode |
| `npm run lint` | ESLint check with a zero-warning threshold (`--max-warnings=0`) |
| `npm run format` | Format sources under `src/` with Prettier |
| `npm run format:check` | Verify formatting without writing changes |

## Platform support

Browser builds are the only supported form. Electron desktop and Android/iOS mobile targets are not implemented and their platform support has been removed; for desktop or mobile use, open the backend's WebUI in a browser instead.

## Related documentation

- [Development guide](docs/DEVELOPMENT_GUIDE.md)
- [Component guide](docs/COMPONENT_GUIDE.md)
- [E2E testing guide](docs/E2E_TESTING_GUIDE.md)
- [Performance guide](docs/PERFORMANCE_GUIDE.md)
- [URL download feature](docs/URL_DOWNLOAD_FEATURE.md)
- [Build options](docs/BUILD_OPTIONS.md)

## Related links

- Main repository: [PixivFlow](https://github.com/redtidev1918/PixivFlow) (CLI and backend)
- API reference: [main repo docs/API.md](https://raw.githubusercontent.com/redtidev1918/PixivFlow/master/docs/API.md)
- Bug reports: [Issues](https://github.com/redtidev1918/pixivflow-webui/issues)

## License

MIT — see [LICENSE](LICENSE).
