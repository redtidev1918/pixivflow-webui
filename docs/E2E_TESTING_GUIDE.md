# E2E 测试指南

> **English:** This guide explains how the Playwright end-to-end suite in `e2e/` works and how to run it. Playwright starts only the Vite dev server; the PixivFlow backend on port `3000` must be running beforehand. There is no global login fixture or `storageState`: authentication is reset inside `auth.spec.ts` by calling the backend logout API and clearing cookies/storage. The document also records the selector conventions used by the existing specs and their known weak spots.

## 概述

- 框架:`@playwright/test`(`^1.56.1`,见 `package.json`)
- 用例目录:`e2e/`,共 6 个 spec 文件
- 运行对象:Vite 开发服务器(`http://localhost:5173`)+ 本机后端 API(`http://localhost:3000`)

| 文件 | 覆盖范围 |
| --- | --- |
| `auth.spec.ts` | 登录页渲染、无效凭据提示、认证状态重置流程 |
| `navigation.spec.ts` | 页面间跳转、导航菜单存在性、根路径重定向 |
| `dashboard.spec.ts` | 仪表板加载、统计区块(弱断言) |
| `config.spec.ts` | 配置页加载、编辑器可见与可编辑 |
| `download.spec.ts` | 下载页加载、控件/状态元素探测 |
| `files.spec.ts` | 文件页加载、列表/导航元素探测 |

## 环境准备

### 安装依赖与浏览器

```bash
npm install
npx playwright install
```

### 启动后端 API

Playwright 配置只负责拉起前端 dev server,**不会启动后端**。`auth.spec.ts` 在 `beforeEach` 里直接以 `request.get('http://localhost:3000/api/auth/status')`、`request.post('http://localhost:3000/api/auth/logout')` 访问后端,因此后端必须先监听 `3000`(或用 `VITE_DEV_API_PORT` 改代理目标并同步修改 spec)。

常用方式:

```bash
# 方式一:全局安装的 CLI
npm install -g pixivflow && pixivflow webui

# 方式二:主仓库源码(构建并启动 WebUI 服务)
cd ../PixivFlow && npm run webui
```

前端 dev server 无需手动启动,详见下节 `webServer`。

## 配置解读(playwright.config.ts)

| 配置项 | 值 | 说明 |
| --- | --- | --- |
| `testDir` | `./e2e` | 只收集该目录下的 spec |
| `fullyParallel` | `true` | 文件内用例默认并行 |
| `retries` | CI 为 `2`,本地为 `0` | 本地失败立即报错,不重试 |
| `workers` | CI 为 `1`,本地按 CPU | CI 串行避免相互影响 |
| `reporter` | `html` + `list`;CI 额外 `github` | HTML 报告输出到 `playwright-report/` |
| `baseURL` | `http://localhost:5173` | `page.goto('/login')` 等相对路径基于此 |
| `trace` | `on-first-retry` | 仅重试时采集 trace;本地无重试即默认无 trace |
| `screenshot` / `video` | `only-on-failure` / `retain-on-failure` | 失败附件自动进报告 |
| `projects` | chromium、firefox、webkit、Mobile Chrome(Pixel 5)、Mobile Safari(iPhone 12) | 每个 spec 默认跑 5 个项目 |
| `webServer` | `command: 'npm run dev'`,URL `http://localhost:5173` | `reuseExistingServer: !process.env.CI`,本地已有 dev server 则复用;启动超时 120 秒 |

## 运行测试

```bash
npm run test:e2e            # 全量(5 个浏览器项目)
npm run test:e2e:ui         # Playwright UI 模式,推荐调试用
npm run test:e2e:headed     # 有头模式
npm run test:e2e:debug      # Inspector 逐步调试
npm run test:e2e:report     # 打开上次 HTML 报告
```

常用筛选:

```bash
npx playwright test e2e/auth.spec.ts          # 单个文件
npx playwright test -g "login"                # 按标题过滤
npx playwright test --project=chromium        # 单一浏览器项目
npx playwright test --trace on               # 本地强制采集 trace
npx playwright show-trace test-results/…      # 查看已生成的 trace
```

## 认证状态处理

### 没有全局登录机制

全仓库未使用 `storageState`、`globalSetup` 或自定义 auth fixture。绝大多数页面受 `ProtectedRoute` 保护,未认证会被重定向到 `/login`,现有 spec 因此普遍采用"登录页或目标页"二选一的宽容断言,不做真实登录。

### auth.spec.ts 的重置流程

该 spec 的 `beforeEach` 手工把环境打回未认证状态:

1. `GET http://localhost:3000/api/auth/status` 记录登出前状态(失败仅记日志)。
2. `POST http://localhost:3000/api/auth/logout` 清除后端 token。
3. `page.waitForTimeout(500)` 等待清理完成。
4. 再查一次 status,若仍显示已认证则 `console.warn`。
5. `context.clearCookies()`。
6. `page.goto('/login')` 后在页面里执行 `localStorage.clear(); sessionStorage.clear()`。
7. 以 `waitUntil: 'networkidle'` 重新进入 `/login`,再等 `1500ms`,让页面自身的认证状态检查跑完。

单测内部还有分支兜底:如果 `/login` 访问后被重定向到了 `/dashboard`(说明 logout 没生效),用例改为断言仪表板元素而非直接失败。

注意硬编码的后端地址 `http://localhost:3000` 分布在 `auth.spec.ts` 中,改动端口时需要一并更新。

## 编写规范(从现有 spec 归纳)

选择器没有统一的 `data-testid` 体系,实际约定是多候选链 + 宽容命中:

| 场景 | 写法示例 |
| --- | --- |
| 双语文本 | `button:has-text("Login"), button:has-text("登录")` |
| 输入框属性兜底 | `input[type="password"], input[name="password"]` |
| class 片段兜底 | `[data-testid="stats"], .stats, [class*="stat"]` |
| 规避 strict mode | 所有模糊定位都加 `.first()` |

典型的宽容断言组合:

```ts
const loginButton = page.locator('button:has-text("Login"), button:has-text("登录")').first();
const isVisible = await loginButton.isVisible({ timeout: 5000 }).catch(() => false);
expect(isVisible).toBe(true);
```

其他约定:

- 新增用例沿用同一原则:定位不确定时列出多候选并逐个 `.catch(() => false)`。
- CI 下 `forbidOnly` 生效,不要提交 `test.only`。
- 不写死页面业务文案以外的内容;i18n 存在中英两套时两条文本都放进候选链。

## 已知不稳定点

以下问题来自现状代码,写新用例时应规避或推动修复:

| 问题 | 位置与表现 |
| --- | --- |
| 固定等待代替条件等待 | 多处 `waitForTimeout(500~2000)`,慢机器上可能偶发超时;应改用 `expect(locator).toBeVisible()` 轮询 |
| `networkidle` 依赖 | Socket.IO 长连接可能让 `waitForLoadState('networkidle')` 变慢或行为不定 |
| 弱断言 | `download.spec.ts` 等多数断言只检查 `body` 可见,不校验业务内容,回归价值有限 |
| 移动视口无适配 | Mobile Chrome/Safari 两个 project 复用桌面用例,响应式布局差异靠运气通过 |
| 登出失败的静默分支 | `auth.spec.ts` 登出失败时只 `console.warn` 并走 dashboard 分支,用例仍绿,问题易被掩盖 |
| 本地无 trace/retry | `trace: 'on-first-retry'` 且本地 `retries: 0`,失败排查需手动加 `--trace on` |

## 故障排除

| 现象 | 原因与处理 |
| --- | --- |
| spec 大面积失败,`auth.spec.ts` 日志出现 request 连接错误 | 后端未启动。先按上文启动 `pixivflow webui` 或主仓库 WebUI 服务 |
| 改动不生效,像是在测旧代码 | 本地 `5173` 已有 dev server 且被 `reuseExistingServer` 复用;重启它或加 `CI=1` 让 Playwright 自行拉起 |
| 提示缺浏览器可执行文件 | 运行 `npx playwright install`(CI 镜像同理) |
| 报告为空 | 未生成本地失败记录时可先跑 `npx playwright test`,再 `npm run test:e2e:report` |

## 相关文档

### 主仓库(PixivFlow)

- [快速开始](https://github.com/redtidev1918/PixivFlow/blob/master/docs/QUICKSTART.md) —— 被测后端的安装与登录
- [Docker 部署](https://github.com/redtidev1918/PixivFlow/blob/master/docs/DOCKER.md) —— 3000 端口容器形态的端口映射

### 主仓库(PixivFlow)

- [快速开始](https://github.com/redtidev1918/PixivFlow/blob/master/docs/QUICKSTART.md) —— 被测后端的安装与登录
- [Docker 部署](https://github.com/redtidev1918/PixivFlow/blob/master/docs/DOCKER.md) —— 3000 端口容器形态的端口映射

- [E2E 快速参考](../e2e/README.md) — 常用命令速查
- [DEVELOPMENT_GUIDE](DEVELOPMENT_GUIDE.md) — 开发环境搭建
- [BUILD_OPTIONS](BUILD_OPTIONS.md) — 构建与部署选项
- [API 参考](https://github.com/redtidev1918/PixivFlow/blob/master/docs/API.md) — 后端接口(主仓库文档)
