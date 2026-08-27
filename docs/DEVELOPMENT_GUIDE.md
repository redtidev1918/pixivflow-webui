# PixivFlow WebUI 开发指南

> **English:** This guide covers local development of the PixivFlow WebUI frontend. It lists every npm script, explains how the Vite dev server proxies REST and Socket.IO traffic to the backend, and documents the conventions for state management (TanStack Query keys plus Zustand stores), i18n, code style, and tests. The backend lives in a separate repository (`pixivflow` CLI + Express); this repo only builds the browser UI. Read this page before your first contribution.

## 环境要求

| 依赖 | 版本 / 获取方式 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 18 | 以 README 口径为准;package.json 未声明 `engines` 字段 |
| npm | 随 Node.js | 项目提交了 `package-lock.json`,请用 npm 安装依赖 |
| PixivFlow 后端 | 独立仓库 | `npm install -g pixivflow && pixivflow webui`,默认监听 3000 端口 |
| Playwright 浏览器 | `npx playwright install` | 只跑 e2e 测试时需要 |

核心技术栈(版本取自 package.json):React ^18.2、TypeScript ~5.2、Ant Design ^5.12、Vite ^7.2、React Router ^6.20、TanStack Query ^5.12、Zustand ^4.4、socket.io-client ^4.6、i18next ^25;测试为 Jest ^29 + Testing Library + Playwright ^1.56。

## 快速开始

```bash
npm install
npm run dev        # 前端 http://localhost:5173
npm test           # 单元测试
```

开发代理会把 `/api` 与 `/socket.io` 转发到本机后端(默认 `http://localhost:3000`),因此先启动后端再打开页面。

## npm 脚本总表

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器(端口 5173) |
| `npm run build` | 生产构建:`tsc && vite build`,输出到 `dist/` |
| `npm run preview` | 本地预览生产构建产物 |
| `npm run lint` | ESLint 检查,`--max-warnings 0`,任何 warning 都算失败 |
| `npm test` | 运行 Jest 全部单元测试 |
| `npm run test:watch` | Jest watch 模式 |
| `npm run test:coverage` | Jest 覆盖率报告(阈值见下文) |
| `npm run test:e2e` | Playwright 端到端测试 |
| `npm run test:e2e:ui` / `:headed` / `:debug` | Playwright UI 模式 / 有头 / 调试运行 |
| `npm run test:e2e:report` | 打开 Playwright HTML 报告 |
| `npm run format` | Prettier 写盘格式化 |
| `npm run format:check` | Prettier 仅校验不改文件 |

## 开发模式

### Vite 配置要点(vite.config.ts)

| 配置项 | 实际值 | 影响 |
| --- | --- | --- |
| `server.port` | 5173 | 固定端口,Playwright 也按此端口探测 |
| `resolve.alias` | `@ → ./src` | 与 tsconfig 的 paths 配置保持一致 |
| `build.outDir` / `build.sourcemap` | `dist` / true | 生产构建同样输出 .map 文件 |
| `base` | `./` | 相对路径引用资源;上方“支持 Capacitor”的注释已过时(Capacitor 支持已移除) |

### API 代理与端口覆盖

配置文件开头读取一次环境变量:

```ts
const DEV_API_PORT = process.env.VITE_DEV_API_PORT || 3000;
```

代理规则:

| 路径 | 目标 | 选项 |
| --- | --- | --- |
| `/api` | `http://localhost:$DEV_API_PORT` | `changeOrigin: true` |
| `/socket.io` | 同上 | `ws: true`(WebSocket 升级) |

后端换端口或跑在别处时:

```bash
VITE_DEV_API_PORT=3001 npm run dev
```

### 生产模式的 API 地址

由 `src/services/api/client.ts` 决定,优先级:

1. 构建期注入的 `VITE_API_BASE_URL`,实际请求地址为 `${VITE_API_BASE_URL}/api`;
2. 否则用相对路径 `/api`,即前后端同源。

远程后端构建示例:

```bash
VITE_API_BASE_URL=http://192.168.1.100:3000 npm run build
```

标准部署形态是主仓库(PixivFlow 后端)直接托管 `dist/`,前后端同源、无跨域问题。Docker 场景下镜像由主仓库构建,构建过程自动拉取本仓库源码打进镜像——本仓库作为主仓库的可选组件存在,不单独发布镜像;Electron/Android/iOS 支持已移除,不要往这个方向恢复代码。

### 实时通道的实现约束

- `src/services/socket.ts` 刻意不用 `import.meta`(保证 CommonJS 的 Jest 环境可导入),后端端口解析在 `resolveApiUrl()` 中独立实现了一份——调整端口逻辑时两处都要改;
- Socket.IO 连接是引用计数的共享单连接:`acquireSocket()` / `releaseSocket()` 必须成对调用,cleanup 函数里释放;
- 服务端事件契约:`logs` 频道推 `{ type: 'initial' | 'new', ... }`,`download` 频道推任务快照,payload 形状与 `GET /api/download/status` 相同。REST 共 52 个端点(/api/auth、config、download、stats、logs、files 及 /api/health 与 /health 别名),明细以主仓库的 docs/API.md 为准。

## 目录结构

```
src/
├── components/     # 共享组件(Layout / common / forms / tables / modals)
├── pages/          # 路由页面,每页自带 components/ 与 hooks/
├── hooks/          # 跨页面复用的自定义 Hooks
├── services/       # API 客户端(api/ 子模块)+ socket.ts
├── stores/         # Zustand stores(authStore、uiStore)
├── constants/      # QUERY_KEYS、REFRESH_INTERVALS 等常量
├── i18n/           # i18next 初始化
├── locales/        # zh-CN.json / en-US.json
├── utils/ types/   # 工具函数与类型声明
└── __tests__/      # 单元与集成测试
e2e/                # Playwright 用例
build/              # 主仓库构建流程使用的前后校验脚本
```

## 状态管理约定

### TanStack Query(服务端状态)

全局默认值(`src/main.tsx`):

| 选项 | 值 |
| --- | --- |
| `staleTime` | 5 分钟 |
| `gcTime` | 10 分钟 |
| `retry` | 1 次 |
| `refetchOnWindowFocus` | false |

查询键一律从 `src/constants/index.ts` 的 `QUERY_KEYS` 取,禁止内联字面量:

```ts
QUERY_KEYS.DOWNLOAD_STATUS(taskId?)   // ['download','status'] 或带 taskId
QUERY_KEYS.LOGS(params?)              // ['logs'] 或 ['logs', params]
QUERY_KEYS.FILES_RECENT(params?)      // ['files','recent', params]
```

键的组织规则:

- 第一段是资源域(auth/config/download/stats/logs/files),第二段是资源名,查询参数作为后续元素并入数组;
- 带参键用工厂函数生成,同一资源的不同参数天然分桶,失效时可只针对无参版本广播到整组;
- 认证相关查询(`AUTH_STATUS`、useAuth、登录流)显式设置 `staleTime: 0` 并强制 refetchOnMount,保证每次挂载都拿到真实的登录状态。

失效与写缓存:

- mutation 成功后只失效受影响的键(useDownload 的 start/stop 成功 → 失效 `DOWNLOAD_STATUS`);
- 任务从 running 变为终态时连锁失效 `['stats']`、`DOWNLOAD_HISTORY`、`INCOMPLETE_TASKS`;
- 推送数据形状与 REST 一致时优先 `queryClient.setQueryData()` 直写(download 快照),不发重复请求。

### Zustand(客户端状态)

| store | 持久化键 | 内容 |
| --- | --- | --- |
| `authStore` | `auth-storage` | isAuthenticated、userId、username、token、tokenExpiry(partialize 后持久化) |
| `uiStore` | `ui-storage` | theme、sidebarCollapsed、language、compactMode、tablePageSize |

原则:接口数据进 React Query,界面偏好和轻量客户端状态进 Zustand;不在 store 里保存可以从 API 派生的数据。

## 国际化(i18next 双语)

`src/i18n/config.ts` 的初始化行为:

| 行为 | 值 |
| --- | --- |
| 资源命名空间 | 单一 `translation`,内容来自 locales 两个 JSON |
| `fallbackLng` | `zh-CN` |
| 语言检测顺序 | localStorage → navigator,结果缓存到 localStorage 键 `i18nextLng` |
| 切换入口 | LayoutHeader 调用 `i18n.changeLanguage(value)` |

新增文案的步骤:

1. 在 `src/locales/zh-CN.json` 与 `src/locales/en-US.json` 的同一个页面命名空间加入同名 key(现有顶层命名空间:common、layout、dashboard、login、config、download、history、logs、files、errorCodes);
2. 组件里通过 `useTranslation().t('config.xxx')` 使用;
3. 运行 `node check-translations.js` 校验两侧 key 一致(有缺失时退出码 1);
4. AntD 组件内置文案由 `I18nProvider` 按 `i18n.language` 映射到 zh_CN/en_US,不需要手动传 locale。

注意:部分共享组件带有未经 `t()` 的默认文案(FormModal 的 submitText 默认 `Submit`、DataTable 的 emptyText 默认 `No data`、EmptyState 默认「暂无数据」)。新组件必须显式传入翻译后的字符串,不要依赖这些默认值。

## 代码风格

### ESLint(.eslintrc.json)

extends:`eslint:recommended`、`@typescript-eslint/recommended`、`react-hooks/recommended`、`react/recommended`。关键规则:

- `react-refresh/only-export-components`:warn;
- `@typescript-eslint/no-explicit-any`:warn;
- `no-unused-vars`:warn,忽略 `^_` 前缀的参数与变量;
- `react/react-in-jsx-scope`、`react/prop-types`:关闭。

`npm run lint` 带 `--max-warnings=0`,所以上述 warn 实质上都会阻断检查。忽略目录:dist、node_modules。

### Prettier(.prettierrc.json)

| 选项 | 值 |
| --- | --- |
| semi / useTabs / tabWidth | true / false / 2 |
| singleQuote / trailingComma | true / es5 |
| printWidth | 100 |
| arrowParens / endOfLine | always / lf |

作用范围 `"src/**/*.{ts,tsx,json,css}"`;`format` 写盘,`format:check` 只校验。

### TypeScript(tsconfig.json)

strict 系列全开,并额外启用 `noUncheckedIndexedAccess`、`noImplicitReturns`、`noImplicitOverride`。`npm run build` 先跑 `tsc`(noEmit 类型检查)再 vite build,类型错误会直接阻断构建。路径别名 `@/* → ./src/*`。

## 测试

### 金字塔分层

| 层 | 工具 | 位置 | 覆盖对象 |
| --- | --- | --- | --- |
| 单元 | Jest + RTL | `src/**/__tests__/` | 组件、hooks、services、stores、utils |
| 集成 | RTL | `src/__tests__/integration/` | config / download / files 页面流程 |
| 性能 / 可访问性 | performance.now 计时、jest-axe | `src/__tests__/performance/`、`.../accessibility/` | DataTable 渲染耗时兜底、a11y 扫描 |
| e2e | Playwright | `e2e/*.spec.ts` | auth、config、dashboard、download、files、navigation |

### Jest 要点(jest.config.cjs)

- preset ts-jest,jsdom 环境,roots 限定 `src`;
- 覆盖率阈值:branches / functions / lines / statements 均 50%;
- moduleNameMapper 处理 `@` 别名、CSS(identity-obj-proxy)、i18n 相关 mock(`__mocks__/i18next-browser-languagedetector.js`、`src/test/mocks/i18nConfigMock.ts`);
- 测试环境通过 globals 注入模拟的 `import.meta.env`。

### Playwright 要点(playwright.config.ts)

- baseURL 为 http://localhost:5173;webServer 自动执行 `npm run dev`(非 CI 时复用已启动的服务);
- 浏览器矩阵:Chromium / Firefox / WebKit / Mobile Chrome(Pixel 5)/ Mobile Safari(iPhone 12);
- CI 下 retries 2、workers 1、`forbidOnly`;失败自动截图与录屏,首次重试收集 trace;
- 具体写法参考 [E2E_TESTING_GUIDE](./E2E_TESTING_GUIDE.md) 与 [../e2e/README.md](../e2e/README.md)。

## 提交规范

仓库现况:标题以简体中文一行说明动机(例:“修复认证状态判断错误:移除 hasToken 检查”),部分提交使用 Conventional Commits 前缀(fix:/feat:/test:/docs:)。要求:

- 一个提交只做一件事,标题一行讲清“为什么”,不写 "update files" 这类空标题;
- 前缀可选,用了就保持小写英文加冒号;
- 提交前本地必须通过 `npm run lint` 与 `npm test`;动到依赖或构建配置时加跑 `npm run build`;
- dist/ 与 node_modules 不入库(gitignore 已覆盖),不要手动添加。

## 相关文档

### 主仓库(PixivFlow)

- [架构总览](https://github.com/redtidev1918/PixivFlow/blob/master/docs/ARCHITECTURE.md) —— 前端所消费的后端分层与模块边界
- [WebUI API 契约](https://github.com/redtidev1918/PixivFlow/blob/master/docs/API.md) —— REST 端点与 Socket 事件,services 层的唯一事实来源
- [贡献指南](https://github.com/redtidev1918/PixivFlow/blob/master/docs/project/CONTRIBUTING.md) —— 跨仓库协作流程

### 主仓库(PixivFlow)

- [架构总览](https://github.com/redtidev1918/PixivFlow/blob/master/docs/ARCHITECTURE.md) —— 前端所消费的后端分层与模块边界
- [WebUI API 契约](https://github.com/redtidev1918/PixivFlow/blob/master/docs/API.md) —— REST 端点与 Socket 事件,services 层的唯一事实来源
- [贡献指南](https://github.com/redtidev1918/PixivFlow/blob/master/docs/project/CONTRIBUTING.md) —— 跨仓库协作流程

- [COMPONENT_GUIDE](./COMPONENT_GUIDE.md) — 共享组件职责与 props 一览
- [PERFORMANCE_GUIDE](./PERFORMANCE_GUIDE.md) — 分包、缓存与实时通道机制
- [E2E_TESTING_GUIDE](./E2E_TESTING_GUIDE.md) — Playwright 用法详解
- [BUILD_OPTIONS](./BUILD_OPTIONS.md) — 构建产物形态说明
- [URL_DOWNLOAD_FEATURE](./URL_DOWNLOAD_FEATURE.md) — URL 下载页功能说明
- [../README.md](../README.md) — 项目定位与快速上手
