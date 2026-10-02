# PixivFlow WebUI

**Language / 语言:** [中文](README.md) · English

> **The browser front-end of the PixivFlow download manager.**

[Full documentation](https://redtidev1918.github.io/pixivflow-webui/)

[![Release](https://img.shields.io/github/v/release/redtidev1918/pixivflow-webui)](https://github.com/redtidev1918/pixivflow-webui/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/Docs-documentation-6366f1?style=flat-square)](https://redtidev1918.github.io/pixivflow-webui/)

PixivFlow WebUI is the browser front-end of the PixivFlow download manager. The PixivFlow backend — a TypeScript CLI paired with an Express service that serves both REST API and WebUI on port 3000 by default — lives in the [main repository](https://github.com/redtidev1918/PixivFlow). This repository ships UI code only and talks to the backend over HTTP API and Socket.IO: dashboards, download management, file browsing, realtime logs, and the configuration editor are all implemented here. The official desktop distribution [pixivflow-desktop](https://github.com/redtidev1918/pixivflow-desktop) bundles the PixivFlow runtime together with this WebUI as a native app.

## Feature overview

| Feature | Page | Description |
| --- | --- | --- |
| Dashboard stats | `/dashboard` | Overview, download statistics, author and tag distributions (`/api/stats/*`) |
| Task management | `/download` | View task snapshots; start, stop, resume, run-all, random downloads; history and incomplete tasks |
| URL download | `/url-download` | Parse single or batched URLs and submit download tasks |
| File browsing & preview | `/files` | File list, recent files, content preview |
| Download history | `/history` | Browse and delete historical tasks |
| Deliveries panel | `/deliveries` | Read-only projection of gateway routes and the delivery ledger (`/api/gateways*`, `/api/deliveries*`); pairing is pass-through |
| Realtime logs | `/logs` | Incremental log stream pushed over Socket.IO |
| Config editor | `/config` | Grouped forms + JSON editor; validate, back up, repair, save and restore (roll back) configuration history |

All pages except the login page (`/login`) render inside protected routes and require prior authentication.

## Talking to the backend

| Channel | Details |
| --- | --- |
| REST | Grouped by domain: `/api/auth`, `/api/config`, `/api/download`, `/api/stats`, `/api/logs`, `/api/files`, plus the deliveries panel's read-only projections `/api/gateways`, `/api/gateways/:name`, `/api/gateways/:name/pairing`, `/api/deliveries`, `/api/deliveries/:id`; health checks at `/api/health` (alias `/health`) |
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
│   ├── pages/        # Dashboard / Config / Deliveries / Download / Files / History / Logs / Login / UrlDownload
│   ├── services/     # axios API clients (api/) and the shared Socket.IO connection (socket.ts)
│   ├── stores/       # Zustand stores (auth / ui)
│   ├── hooks/        # Data-fetching and interaction hooks
│   ├── locales/      # zh-CN.json / en-US.json
│   ├── i18n/         # i18next bootstrap
│   ├── types/        # Shared type definitions
│   └── __tests__/    # Jest unit tests
├── e2e/              # Playwright specs (auth / dashboard / config / download / files / navigation)
├── docs/             # Development, component, E2E and performance guides
└── vite.config.ts    # Dev server (5173) with /api and /socket.io proxying (Playwright config: playwright.config.ts)
```

## Getting started

Prerequisites: Node.js 20.19+ or 22.12+ (required by Vite 7) and a running PixivFlow backend.

Start the backend (the npm package published from the main repository):

```bash
npm install -g pixivflow
pixivflow webui          # listens on http://localhost:3000 by default
```

Clone this repository and start the front-end dev server:

```bash
git clone https://github.com/redtidev1918/pixivflow-webui.git
cd pixivflow-webui
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

## Docker one-command deployment

The image (Nginx serving the static bundle, reverse-proxying `/api` and `/socket.io` to the PixivFlow WebUI backend) is published to GHCR under `v*` tags: `ghcr.io/redtidev1918/pixivflow-webui` (amd64 + arm64).

Prerequisite: a running PixivFlow WebUI backend listening on `0.0.0.0`:

```bash
# Backend (npm package from the PixivFlow main repository)
HOST=0.0.0.0 pixivflow webui        # or a standalone webui container / kit setup
```

One-command start (proxies to `host.docker.internal:3000` by default, works on Linux too):

```bash
cp .env.example .env      # edit if you need a different backend address/port
docker compose up -d      # open http://127.0.0.1:3001
```

Or a single docker run:

```bash
docker run -d --name pixivflow-webui --restart unless-stopped \
  --add-host host.docker.internal:host-gateway \
  -p 3001:80 \
  -e UPSTREAM_API=http://host.docker.internal:3000 \
  ghcr.io/redtidev1918/pixivflow-webui:latest
```

Notes:

- **Backend Basic Auth**: if the backend enables `WEBUI_USERNAME`/`WEBUI_PASSWORD`, the browser's `Authorization` header is passed through the proxy as-is; nothing to configure again on the front-end container.
- **Cross-machine deployment**: point `UPSTREAM_API` at the backend's real address (`http://backend-ip:3000`); the front-end container and the backend do not need to share a host.
- Local build: `docker compose build` (equivalent to `docker build -t pixivflow-webui .`).
- Port conflicts can be resolved via `WEBUI_PORT` in `.env` (default 3001, avoiding the backend's 3000 and telepost's 8080).

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

Browser builds are the only supported form. Electron desktop and Android/iOS mobile targets are not implemented and their code has been removed from this repository (there is no `window.electron` branch left); for desktop or mobile use, open the backend's WebUI in a browser instead, or see the official [pixivflow-desktop](https://github.com/redtidev1918/pixivflow-desktop) distribution (a native app bundling this WebUI).

## Documentation

This README covers what the project is and how to get started; development, components, and build details live on the [docs site](https://redtidev1918.github.io/pixivflow-webui/):

| What you want | Where |
| --- | --- |
| Local dev environment and scripts | [Development guide](docs/DEVELOPMENT_GUIDE.md) |
| Component responsibilities | [Component guide](docs/COMPONENT_GUIDE.md) |
| Static hosting vs all-in-one Docker | [Build options](docs/BUILD_OPTIONS.md) |
| End-to-end tests | [E2E testing guide](docs/E2E_TESTING_GUIDE.md) |
| Front-end performance tuning | [Performance guide](docs/PERFORMANCE_GUIDE.md) |
| URL download feature | [URL download feature](docs/URL_DOWNLOAD_FEATURE.md) |
| Deliveries panel and gateway pairing | [Deliveries panel](docs/DELIVERY_PANEL.md) |
| Embedding as a desktop-shell host | [Desktop host](docs/DESKTOP_HOST.md) |

## Related links

- Main repository: [PixivFlow](https://github.com/redtidev1918/PixivFlow) (CLI and backend)
- Main-repo docs hub: [docs/README.md](https://github.com/redtidev1918/PixivFlow/blob/master/docs/README.md)
- API reference: [main repo docs/API.md](https://raw.githubusercontent.com/redtidev1918/PixivFlow/master/docs/API.md)
- Desktop client: [pixivflow-desktop](https://github.com/redtidev1918/pixivflow-desktop) (native app bundling the PixivFlow runtime and this WebUI)
- Bug reports: [Issues](https://github.com/redtidev1918/pixivflow-webui/issues)

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgements

The front end is built on [React](https://react.dev), [Ant Design](https://ant.design),
[TanStack Query](https://tanstack.com/query), [socket.io-client](https://socket.io),
[axios](https://axios-http.com), [i18next](https://www.i18next.com), and
[Zustand](https://zustand.docs.pmnd.rs); the backend contract lives in the
[PixivFlow main repo](https://github.com/redtidev1918/PixivFlow) WebUI API docs.
