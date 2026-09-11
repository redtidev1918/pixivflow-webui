# Download PixivFlow WebUI

**Language / 语言:** [中文](/download.md) · English

PixivFlow WebUI is a component of PixivFlow and is **not distributed as a standalone
installer** — it ships as prebuilt static assets inside the PixivFlow Docker image and
the `pixivflow` npm package. Three ways to get it:

## 1. Use it with PixivFlow (recommended)

The front-end assets are bundled in the official PixivFlow image and the `pixivflow`
npm package. Install the main program and start WebUI:

```bash
npm install -g pixivflow
pixivflow webui          # listens on port 3000; open http://localhost:3000
```

With Docker, start the compose service instead:

```bash
docker compose up -d pixivflow-webui
```

See the [PixivFlow download page](https://github.com/redtidev1918/PixivFlow/blob/master/docs/download.md).

## 2. Build from source

```bash
git clone https://github.com/redtidev1918/pixivflow-webui.git
cd pixivflow-webui
npm ci
npm run build            # output goes to dist/
```

See [Build options](/BUILD_OPTIONS.md) for the two delivery paths and the environment
variables that apply.

## 3. Releases

This repository's releases only carry per-release metadata (`RELEASE-METADATA.json`);
there is no standalone package:

<https://github.com/redtidev1918/pixivflow-webui/releases>

## Related

- [PixivFlow main repository](https://github.com/redtidev1918/PixivFlow)
- [Documentation home (中文)](/)
