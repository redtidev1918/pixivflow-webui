# PixivFlow WebUI

> **English:** PixivFlow WebUI is the browser front-end of the PixivFlow download manager. The PixivFlow backend — a TypeScript CLI paired with an Express service that serves both REST API and WebUI on port 3000 by default — lives in a separate main repository. This repository ships UI code only and is treated as an optional component of that repo: the backend exposes 52 REST endpoints plus two Socket.IO channels (`logs`, `download`), while this project renders dashboards, download management, file browsing, log streaming and a configuration editor in the browser.

PixivFlow 的浏览器端管理界面。PixivFlow 本体(TypeScript CLI 与 Express 服务)在独立的主仓库中维护;本仓库只包含前端代码,作为主仓库的可选组件使用——后端提供 REST API 与实时推送,本仓库负责浏览器侧的全部界面。

## 功能速览

| 功能 | 页面 | 说明 |
| --- | --- | --- |
| 仪表盘统计 | `/dashboard` | 总览、下载统计、作者与标签分布(`/api/stats/*`) |
| 任务管理 | `/download` | 任务快照查看,启动、停止、恢复、全部执行、随机下载;含历史与未完成任务 |
| URL 下载 | `/url-download` | 解析单条或批量 URL 后提交下载任务 |
| 文件预览 | `/files` | 文件列表、最近文件、内容预览 |
| 下载历史 | `/history` | 历史任务查看与删除 |
| 实时日志 | `/logs` | 经 Socket.IO 推送的增量日志流 |
| 配置编辑器 | `/config` | 分组表单 + JSON 编辑器;校验、备份、修复,配置历史保存与恢复(回滚) |

除登录页(`/login`)外,所有页面均在受保护路由内渲染,访问前需完成认证。

## 与后端的连接

| 通道 | 说明 |
| --- | --- |
| REST | 共 52 个端点:`/api/auth`、`/api/config`、`/api/download`、`/api/stats`、`/api/logs`、`/api/files`;健康检查为 `/api/health`(别名 `/health`) |
| Socket.IO `logs` | 连接后先推送 `{ type: 'initial', lines }` 存量日志,之后每行推送 `{ type: 'new', line }` |
| Socket.IO `download` | 推送任务快照,payload 形状与 `GET /api/download/status` 的响应一致 |

REST 端点完整定义见主仓库 [docs/API.md](https://raw.githubusercontent.com/redtidev1918/PixivFlow/master/docs/API.md)。

## 技术栈

| 类别 | 选型 |
| --- | --- |
| UI 框架 | React 18 · TypeScript · Ant Design 5 · React Router 6(BrowserRouter) |
| 状态管理 | TanStack Query v5(服务端状态)· Zustand(客户端状态) |
| 实时通信 | socket.io-client |
| 国际化 | i18next(`zh-CN` / `en-US`) |
| 构建 | Vite |
| 测试 | Jest · React Testing Library · jest-axe(单元)· Playwright(E2E) |

## 目录结构

```
pixivflow-webui/
├── src/
│   ├── components/   # Layout / forms / tables / modals / common
│   ├── pages/        # Dashboard / Config / Download / Files / History / Logs / Login / UrlDownload
│   ├── services/     # axios API 客户端(api/)与共享 Socket.IO 连接(socket.ts)
│   ├── stores/       # Zustand store(auth / ui)
│   ├── hooks/        # 数据获取与交互 Hooks
│   ├── locales/      # zh-CN.json / en-US.json
│   ├── i18n/         # i18next 初始化配置
│   ├── types/        # 共享类型定义
│   └── __tests__/    # Jest 单元测试
├── e2e/              # Playwright 端到端测试(auth / dashboard / config / download / files / navigation)
├── docs/             # 开发、组件、E2E、性能等指南
├── build/            # 构建前检查与构建后验证脚本
└── vite.config.ts    # dev server(5173)与 /api、/socket.io 代理(Playwright 配置见 playwright.config.ts)
```

## 快速开始

前置条件:Node.js 20.19+ 或 22.12+(Vite 的版本要求);一个运行中的 PixivFlow 后端。

启动后端(主仓库发布的 npm 包):

```bash
npm install -g pixivflow
pixivflow webui          # 默认监听 http://localhost:3000
```

启动前端开发服务器:

```bash
npm install
npm run dev              # http://localhost:5173,/api 与 /socket.io 自动代理到 localhost:3000
```

后端不在 3000 端口时,设置环境变量 `VITE_DEV_API_PORT` 后再运行 `npm run dev`。

生产构建:

```bash
npm run build            # tsc 类型检查 + Vite 打包,产物输出到 dist/
```

构建产物为静态文件,两种典型用法:

1. **静态托管**(Nginx、CDN 等):`VITE_API_BASE_URL` 未设置时,前端以相对路径 `/api` 访问同源后端,因此需要把 API 反代到同一域名下,并为 SPA 路由配置回退(所有路径返回 `index.html`);跨源部署则在构建时设置 `VITE_API_BASE_URL=http://backend-host:3000`。
2. **随主仓库 Docker 打包**:主仓库构建镜像时会自动拉取本仓库源码一并构建进镜像,无需单独部署前端。

## 脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器(端口 5173) |
| `npm run build` | 生产构建(`tsc && vite build`) |
| `npm run preview` | 本地预览生产构建 |
| `npm test` | 运行 Jest 单元测试 |
| `npm run test:watch` | 监听模式运行单元测试 |
| `npm run test:coverage` | 运行单元测试并生成覆盖率报告 |
| `npm run test:e2e` | 运行 Playwright 端到端测试(自动拉起 dev server;另有 `:headed`/`:debug`/`:report` 变体) |
| `npm run test:e2e:ui` | 以 Playwright UI 模式运行端到端测试 |
| `npm run lint` | ESLint 检查,零警告阈值(`--max-warnings=0`) |
| `npm run format` | Prettier 格式化 `src/` 下源码 |
| `npm run format:check` | 仅校验格式,不修改文件 |

## 平台支持

当前仅支持浏览器形态。Electron 桌面端与 Android/iOS 移动端未实现,对应平台支持已移除;桌面或移动场景请直接用浏览器访问后端提供的 WebUI。

## 相关文档
- [主仓库文档中心](https://github.com/redtidev1918/PixivFlow/blob/master/docs/README.md)
- [参考与致谢(PixivFlow 主仓库)](https://github.com/redtidev1918/PixivFlow/blob/master/docs/ACKNOWLEDGMENTS.md)

- [开发指南](docs/DEVELOPMENT_GUIDE.md)
- [组件指南](docs/COMPONENT_GUIDE.md)
- [E2E 测试指南](docs/E2E_TESTING_GUIDE.md)
- [性能指南](docs/PERFORMANCE_GUIDE.md)
- [URL 下载功能说明](docs/URL_DOWNLOAD_FEATURE.md)
- [构建选项](docs/BUILD_OPTIONS.md)

## 相关链接

- 主仓库:[PixivFlow](https://github.com/redtidev1918/PixivFlow)(CLI 与后端)
- API 文档:[主仓库 docs/API.md](https://raw.githubusercontent.com/redtidev1918/PixivFlow/master/docs/API.md)
- 问题反馈:[Issues](https://github.com/redtidev1918/pixivflow-webui/issues)

## 许可证

MIT,见根目录 [LICENSE](LICENSE)。
