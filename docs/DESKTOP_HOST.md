# 桌面宿主（pixivflow-desktop）

> **English:** This document describes how the official desktop distribution
> (`pixivflow-desktop`, Tauri 2) hosts this WebUI. The desktop bundle does not
> re-implement the UI: the bundled PixivFlow backend serves this repository's
> built `dist/` over `STATIC_PATH`, and the desktop app renders
> `http://127.0.0.1:{port}/` in a native webview window. Everything
> host-specific must keep working in a plain browser. A host that injects the
> `window.pixivflowHost` login bridge (see below) gets the Pixiv authorization
> window inside the app and no longer needs the system-browser fallback.

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

## 宿主桥接:在 App 内完成 Pixiv 授权

桌面宿主可以在页面里注入 `window.pixivflowHost`,本仓库检测到它之后就走
**App 内窗口**的登录分支,不再让后端拉起系统浏览器。

### 宿主需要注入的接口

```ts
window.pixivflowHost = {
  openLoginWindow(
    authUrl: string,
    redirectUri: string
  ): Promise<{ code: string | null }>;
};
```

- `authUrl` 由后端下发(Pixiv 授权页,已含 PKCE `code_challenge`),
  `redirectUri` 是宿主需要观察的回调地址;
- 宿主打开自己的窗口加载 `authUrl`,并在观察到自己被跳转到 `redirectUri`
  (查询串里带 `code=...`)时解析出 `code` 后 resolve `{ code }`;
- 用户关闭窗口或等待超时则 resolve `{ code: null }`,本仓库据此按「用户取消」
  处理(不弹错误提示,回到待登录状态);
- **窗口由宿主自己关闭**,本仓库不负责关闭。

类型声明见 `src/types/host-bridge.d.ts`,桥接的读取封装在
`src/utils/hostBridge.ts`(`getHostLoginBridge()` / `hasInAppLoginWindow()`)。
未注入 `window.pixivflowHost` 时行为与现在完全一致(普通浏览器仍走后端
Puppeteer 兜底,Electron 壳仍走 `window.electron`)。

### 本仓库使用的两个后端端点(由 PixivFlow 提供)

凭据交换、PKCE 校验、token 落盘都仍在后端完成,本仓库只做编排。

```
POST /api/auth/login/host/start     空请求体
  200 {"success":true,"data":{"loginId","authUrl","redirectUri"}}

POST /api/auth/login/host/complete  {"loginId","code"}
                                    {"loginId","callbackUrl"}
  200 与 POST /api/auth/login 成功响应同形:
      {"success":true,"errorCode":"AUTH_LOGIN_SUCCESS",
       "data":{"accessToken","refreshToken","expiresIn","user"}}
  400 AUTH_HOST_LOGIN_SESSION_INVALID  loginId 未知/过期/已使用
  400 AUTH_CODE_REQUIRED               未提供 code
  401 AUTH_LOGIN_FAILED                token 交换失败
```

流程:`POST /api/auth/login/host/start` → `openLoginWindow(authUrl, redirectUri)`
→ 拿到 `code` 后 `POST /api/auth/login/host/complete`,随后沿用原有的登录状态
轮询与跳转逻辑;等待授权期间页面显示「等待在应用内窗口完成 Pixiv 授权…」。
`loginId` 只在一次登录会话内有效,授权码由后端交换,页面不接触 Pixiv 凭据。

**提供了该桥接的宿主不再需要系统浏览器兜底**:桥接存在时不会走
`POST /api/auth/login`(Puppeteer)那条路径。

## 约束

- 不要为某个宿主在产物里加入宿主专属分支或依赖;产物必须仍是任意静态服务器
  可直接托管、普通浏览器可直接使用的资源。桥接本身通过
  `window.pixivflowHost` 的能力探测接入,不含任何宿主专属依赖。
- 不要恢复仓库内的 Electron / Capacitor 打包(见 [构建选项](/BUILD_OPTIONS.md)),
  桌面宿主是**外部消费者**,其代码不在本仓库。
- 修改登录链路时,请同时确认「无 `window.electron`」环境的降级行为仍然可用。
