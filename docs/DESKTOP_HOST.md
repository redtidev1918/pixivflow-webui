# 桌面宿主（pixivflow-desktop）

> **English:** This document describes how the official desktop distribution
> (`pixivflow-desktop`, Tauri 2) hosts this WebUI. The desktop bundle does not
> re-implement the UI: the bundled PixivFlow backend serves this repository's
> built `dist/` over `STATIC_PATH`, and the desktop app renders
> `http://127.0.0.1:{port}/` in a native webview window. Everything
> host-specific must keep working in a plain browser.

## 形态

```
pixivflow-desktop (.app / .AppImage / .exe)
   └── 自带 runtime: PixivFlow 后端 + 本仓库构建出的 dist/
         └── 后端以 STATIC_PATH 托管 dist/,同源提供 /api 与 /socket.io
               └── 桌面窗口加载 http://127.0.0.1:{port}/
```

- 桌面端**不复制本仓库源码**,也不维护第二套前端:它加载的就是 `npm run build` 的同一份 `dist/`。
- 宿主的 webview 在 macOS 上是 WKWebView、Windows 上是 WebView2,**不是 Electron**:`window.electron` 不存在。
- 桌面端只注入 `PORT` / `HOST` / `STATIC_PATH`,本仓库不感知宿主路径。

## 与浏览器的差异:交互式登录会打开系统浏览器

交互式登录目前只有 Electron 分支是「App 内窗口」:

- `src/hooks/useInteractiveLogin.ts:206` 与 `src/hooks/useLogin.ts:101` 判断
  `isElectron && window.electron?.openLoginWindow()`;
- `window.electron` 只由外部 Electron 壳注入(`src/types/electron.d.ts:10`
  只有类型声明),在普通浏览器与桌面 webview 中恒为 `undefined`;
- 于是走 fallback(`src/hooks/useInteractiveLogin.ts:239`
  `// Fallback to backend API (Puppeteer/Python)`):`POST /api/auth/login`
  带 `headless=false`,由**后端**用 `puppeteer-core` + 系统 Chrome
  (`pixiv-token-getter` 的 `findBrowserExecutable()`)打开可见浏览器窗口,
  完成 Pixiv OAuth PKCE 流程。

所以桌面宿主的现状是:**交互式登录会弹出系统浏览器窗口,而不是在 App 内完成**。
这不是桌面端的 bug —— 是产物里唯一存在的「可见浏览器」交互路径。
浏览器无关的路径是 **Token 登录**(粘贴 `pixiv-token-getter` 产出的 refresh token)。

若要让登录在桌面宿主内完成,必须在本仓库或后端实现一个**不依赖 Electron**
的通用分支(例如由宿主显式声明能力,再由本仓库走该分支),而不是让宿主自己实现
Pixiv 认证:认证属于后端业务边界(见主仓库
[`docs/platform-contract.md`](https://github.com/redtidev1918/PixivFlow/blob/main/docs/platform-contract.md))。

## 约束

- 不要为某个宿主在产物里加入宿主专属分支或依赖;产物必须仍是任意静态服务器
  可直接托管、普通浏览器可直接使用的资源。
- 不要恢复仓库内的 Electron / Capacitor 打包(见 [构建选项](/BUILD_OPTIONS.md)),
  桌面宿主是**外部消费者**,其代码不在本仓库。
- 修改登录链路时,请同时确认「无 `window.electron`」环境的降级行为仍然可用。
