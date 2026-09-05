# 构建选项

> **English:** This document describes every supported way to build and ship the PixivFlow WebUI. There are two delivery paths: a local `npm run build` producing a static `dist/` directory hosted by any web server that reverse-proxies the backend API, or shipping the frontend inside the PixivFlow Docker image built from the main repository. Desktop (Electron) and mobile (Android/iOS/Capacitor) packaging has been removed and is intentionally not covered here. The last section lists which environment variables actually take effect.

## 方案总览

PixivFlow WebUI 是纯浏览器形态的前端,只有两条受支持的产出路径:

| 方案 | 做法 | 适用场景 |
| --- | --- | --- |
| A. 本地构建 | `npm run build` 输出 `dist/`,由任意静态服务器托管并反代 API | 自有 Nginx/CDN、内网部署、自定义域名 |
| B. 主仓库 Docker 镜像 | 作为 PixivFlow 主仓库镜像的可选组件一并构建 | 使用官方容器化部署 |

Electron 打包与 Android Capacitor 打包脚本均已删除,不存在桌面端或移动端安装包。

## 前置条件

- Node.js 18+(见主仓库 `engines` 字段)
- 一个可访问的 PixivFlow 后端(WebUI 服务,默认端口 `3000`)
- `npm install` 安装依赖

## 通用脚本

以下脚本在两种方案中通用(来源:`package.json`):

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器(`5173`),带 HMR 与 API 代理 |
| `npm run build` | 生产构建:`tsc && vite build`,输出到 `dist/`,含 sourcemap |
| `npm run preview` | 本地预览 `dist/`(端口 `4173`) |
| `npm test` | Jest 单元测试 |
| `npm run lint` | ESLint 检查,`--max-warnings 0` 零警告阈值 |

---

## 方案 A:本地构建与静态托管

### 构建产物

```bash
npm run build
```

- 先跑 TypeScript 编译(`tsc`)再打包;`vite.config.ts` 中 `base: './'`,产物使用相对路径引用资源。
- 输出目录 `dist/`,开启 sourcemap。
- 产物是纯静态文件,可托管于 Nginx、Caddy、CDN 或对象存储静态站点。

### 反向代理要求

浏览器端代码统一请求相对路径 `/api`,Socket.IO 走 `/socket.io`,因此托管服务器必须把这两类流量转发到后端:

- `/api/*` → `http://<backend>:3000/api/*`
- `/socket.io/*` → 同上,且需支持 WebSocket 升级(WebSocket 用于实时日志与下载任务推送)

Nginx 示例:

```nginx
server {
    listen 80;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        root /srv/pixivflow-webui/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

未配置反代时页面可以打开,但所有 API 请求会失败。

### 本地预览

```bash
npm run preview
```

在 `http://localhost:4173` 提供构建产物。Vite 默认让 preview 复用 `server.proxy` 规则,因此后端在本机 `3000` 端口运行时可直接冒烟测试。

---

## 方案 B:随主仓库 Docker 构建

主仓库的 `Dockerfile` 将本仓库作为可选组件打进镜像:

1. `COPY webui-frontend ./webui-frontend`:优先使用构建机上名为 `webui-frontend/` 的目录。
2. 若该目录缺少 `package.json`,则浅克隆 GitHub 上的 `redtidev1918/pixivflow-webui`(`git clone --depth 1`)后再构建,构建机无需提前准备前端代码。
3. 执行 `npm ci --prefix webui-frontend && npm run build --prefix webui-frontend`,产出的 `dist/` 由 Express 在运行时直接托管,前后端同源,无需额外反代。

```bash
# 包含 WebUI 的完整镜像
docker build -t pixivflow .

# 跳过前端构建,产出仅含后端 API 的镜像(dist 内只放置占位 index.html)
docker build --build-arg SKIP_WEBUI_BUILD=true -t pixivflow-api .
```

`SKIP_WEBUI_BUILD=true` 时跳过 `npm ci` 与前端构建,镜像启动后仍提供完整 REST API 与健康检查接口,只是没有管理界面。

---

## 开发环境的端口与代理

| 端口 | 用途 |
| --- | --- |
| `5173` | Vite 开发服务器(本仓库 `npm run dev`) |
| `3000` | PixivFlow 后端 WebUI(REST + Socket.IO) |
| `4173` | `npm run preview` 预览服务器 |

`vite.config.ts` 按 `process.env.VITE_DEV_API_PORT || 3000` 解析后端地址,并将 `/api` 与 `/socket.io`(`ws: true`)代理过去。`src/services/socket.ts` 在开发模式下也让 Socket.IO 直连同一端口;生产产物则为同源连接,交给托管层处理。

开发时常见两种组合:

```bash
# 1) 只跑前端(后端已在别处监听 3000)
npm run dev

# 2) 后端不在 3000 端口时,启动 Vite 前指定代理目标
VITE_DEV_API_PORT=3100 npm run dev
```

主仓库亦提供 `npm run dev`,用 concurrently 同时拉起 tsc watch、nodemon 后端与本前端 dev server。

---

## 环境变量

| 变量 | 定义位置 | 实际效果 |
| --- | --- | --- |
| `VITE_DEV_API_PORT` | `vite.config.ts`、`src/services/socket.ts` | **有效**。仅作为进程环境变量读取:决定 dev 代理目标端口与开发模式 Socket.IO 直连端口,缺省 `3000`。不会被打进产物 |
| `VITE_API_BASE_URL` | **生效**(构建期注入)。vite 通过 define 把该值写入产物常量,`client.ts` 以其最高优先级拼接基址(值 + `/api`)。跨源部署指向远端后端时设置,改动后需重新执行 build。开发模式依旧走 vite.config.ts 的 `/api`、`/socket.io` 代理 |
| `VITE_USE_EMBEDDED_BACKEND` | 无 | **已删除**。嵌入式后端(Electron/Android/iOS)方案移除后,仓库内无任何引用 |

结论:静态部署不能靠环境变量改写 API 地址,必须保证 `/api` 与 `/socket.io` 在同源可达(反代),或使用前后端同源的 Docker 形态。

---

## 已移除的平台形态

以下能力曾经存在,现已删除,文档不再描述其构建流程:

- Electron 桌面打包(electron/ 目录与相关脚本已删除)
- Android/iOS Capacitor 打包(脚本与依赖已移除;`vite.config.ts` 仅剩一条「支持 Capacitor」历史注释)
- 嵌入式后端运行模式

仓库中仍有少量无害残留(`package.json` 的 `main` 字段指向不存在的 `electron/main.cjs`,`src/types/electron.d.ts` 等纯类型声明文件),它们不影响 `npm run build` 产物。

---

## 相关文档

### 主仓库(PixivFlow)

- [Docker 部署](https://github.com/redtidev1918/PixivFlow/blob/master/docs/DOCKER.md) —— 自动克隆本仓库并打进镜像的细节
- [文档中心](https://github.com/redtidev1918/PixivFlow/blob/master/docs/README.md) —— 后端全部文档入口

### 主仓库(PixivFlow)

- [Docker 部署](https://github.com/redtidev1918/PixivFlow/blob/master/docs/DOCKER.md) —— 自动克隆本仓库并打进镜像的细节
- [文档中心](https://github.com/redtidev1918/PixivFlow/blob/master/docs/README.md) —— 后端全部文档入口

- [DEVELOPMENT_GUIDE](DEVELOPMENT_GUIDE.md) — 开发环境与工作流程
- [E2E_TESTING_GUIDE](E2E_TESTING_GUIDE.md) — Playwright 端到端测试
- [PERFORMANCE_GUIDE](PERFORMANCE_GUIDE.md) — 性能基线与优化
- [COMPONENT_GUIDE](COMPONENT_GUIDE.md) — 组件设计约定
- [项目 README](https://github.com/redtidev1918/pixivflow-webui/blob/master/README.md) — 快速开始与技术栈
