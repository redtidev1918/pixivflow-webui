# 桌面宿主（pixivflow-desktop）

> **English:** This document describes how the official desktop distribution
> (`pixivflow-desktop`, Tauri 2) hosts this WebUI. The desktop bundle does not
> re-implement the UI: the bundled PixivFlow backend serves this repository's
> built `dist/` over `STATIC_PATH`, and the desktop app renders
> `http://127.0.0.1:{port}/` in a native webview window. Everything
> host-specific must keep working in a plain browser. A host that injects the
> `window.pixivflowHost` login bridge (see below) gets the Pixiv authorization
> page **inside the app** — a host-owned window *or* a view embedded in the host
> window, the host decides — and no longer needs the system-browser fallback.

## 形态

```
pixivflow-desktop (.app / .AppImage / .exe)
   └── 自带 runtime: PixivFlow 后端 + 本仓库构建出的 dist/
         └── 后端以 STATIC_PATH 托管 dist/,同源提供 /api 与 /socket.io
               └── 桌面窗口加载 http://127.0.0.1:{port}/
```

- 桌面端**不复制本仓库源码**,也不维护第二套前端:它加载的就是 `npm run build` 的同一份 `dist/`。
- 宿主的 webview 在 macOS 上是 WKWebView、Windows 上是 WebView2,**不是 Electron**:本仓库也不再有 `window.electron` 分支。
- 桌面端只注入 `PORT` / `HOST` / `STATIC_PATH`,本仓库不感知宿主路径。

## 交互式登录的两条路径

产物里只有两条路径,没有第三条:

| 运行形态 | 行为 |
| --- | --- |
| 注入了 `window.pixivflowHost` 的桌面宿主 | 宿主在 App 内窗口完成授权,登录不经系统浏览器 |
| 普通浏览器 / 未注入桥接的宿主 | 后端打开可见浏览器(`POST /api/auth/login`,`headless=false`,Puppeteer + 系统 Chrome),页面轮询等待 |

- 判断在 `src/hooks/useInteractiveLogin.ts`(`getHostLoginBridge()`),桥接缺失时
  直接走 `// No host: the backend opens a visible browser` 那条;
- 浏览器无关的路径是 **Token 登录**(粘贴 `pixiv-token-getter` 产出的 refresh token)。

**仓库内不再有任何 Electron 分支**:`window.electron`、`src/types/electron.d.ts`
与探测它的登录代码已全部删除。宿主是 Tauri(WKWebView / WebView2),它只通过下面
文档化的桥接声明能力;想让登录在 App 内完成,就实现该桥接,而不是让宿主自己实现
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

  // 可选能力:让用户在**本机**文件管理器里看到下载好的文件
  revealPath?(path: string): Promise<void>;

  // 可选能力:把文本写进**本机**剪贴板(不实现则退回浏览器剪贴板)
  copyText?(text: string): Promise<void>;
};
```

`revealPath` 与 `copyText` 是宿主面向设备的能力,与登录无关,**都可以单独不实现**:
探测封装在 `src/utils/hostCapabilities.ts`(`getHostCapabilities()` /
`canRevealPath()` / `copyToClipboard()`),缺 `revealPath` 时本仓库复制路径到
剪贴板,不报错;缺 `copyText` 时用浏览器剪贴板(所有运行形态都有)。

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
Puppeteer 兜底)。

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

### 宿主实现清单(在 Tauri 2 上实测)

下面几条是接入 `window.pixivflowHost` 时才会暴露的坑,按顺序自查:

1. **注入时机必须早于页面脚本**。宿主要把桥接作为「页面加载前」的初始化脚本
   注入(Tauri 2 用 `WebviewWindowBuilder::initialization_script`),本仓库的
   能力探测发生在页面挂载期;注入晚了会静默退回系统浏览器路径。
2. **宿主的 IPC 安全层必须放行这个命令**。Tauri 2 对**远程来源**(本页面是
   `http://127.0.0.1:{port}/`)**无条件执行 ACL**:只在 capability 里写
   `"remote": { "urls": [...] }` 不够,还要在 `build.rs` 用
   `tauri_build::AppManifest::new().commands(&[...])` 声明 app 命令以自动生成
   `allow-<command>`(`_` 换成 `-`)权限,并在 capability 的 `permissions` 里
   引用它;否则窗口里只会得到
   `Command open_login_window not allowed by ACL`。注意声明 app 清单后
   **本地窗口也开始校验**,启动器自己用到的命令要一并列出。
3. **只把登录命令授予远程 WebUI**。启停/重启/日志这类生命周期命令不应暴露给
   远程来源:按窗口拆 capability(启动器一份、WebUI 窗口只留登录命令)。
4. **返回值形态是 `{ code }`**,不是裸字符串。本仓库读 `loginResult?.code`,
   返回字符串会被当成 `undefined`,进而按「用户取消」处理 —— 登录会静默失败。
5. **后端必须能访问 Pixiv**。`code` 换 token 由后端发起,宿主只回传 `code`:
   若宿主 webview 走系统代理、而后端进程没有任何代理环境变量,交换会失败
   (实测直连 12 秒超时、经代理 0.5 秒返回)。宿主应在启动后端时把系统代理
   转成 `HTTPS_PROXY` / `HTTP_PROXY`(从 Finder/Dock 启动的 app 不继承环境变量)。
6. 登录页是宿主的**瞬时视图**,关闭它不应触发宿主退出或后端停止。
7. **可以内嵌,但不要顶掉 WebUI 页面本身**。宿主既可以用独立窗口展示授权页,也
   可以在自己的窗口里叠加一个子 webview(Tauri 2:`Window::add_child`,需要
   `unstable` feature)。若选择内嵌:不要导航 WebUI 窗口本身去 Pixiv —— 那会丢掉
   本页面里挂起的登录 Promise;子 webview 覆盖在上面时页面继续存活,`{ code }`
   正常回填。子 webview 没有窗口装饰,取消只能由宿主提供(菜单项/快捷键),并且
   要跟随父窗口 `Resized` 调整尺寸、在命令返回前关闭。
   远程 Pixiv 来源**不要**授予任何 capability —— Tauri 的 ACL 会拒绝它的所有
   `invoke`,这是预期行为。

## 设备能力:在文件管理器里显示下载好的文件

「打开文件夹」不是 PixivFlow 服务端的能力,而是**用户面前这台机器**的能力。
后端只回答文件在哪(`GET /api/files/location`,解析并收敛到配置的下载目录,
不打开任何东西);真正的「在 Finder / 资源管理器里定位它」由宿主完成。
理由:Docker、NAS、VPS、Fly.io 上 `浏览器 → 后端 → xdg-open` 毫无意义,还会让
用户以为打开的是自己电脑上的文件夹。契约见主仓库
[`docs/platform-contract.md` §4.7](https://github.com/redtidev1918/PixivFlow/blob/main/docs/platform-contract.md)。

三种运行形态的答案:

| 运行形态 | 界面行为 |
| --- | --- |
| 桌面宿主,实现 `revealPath` | 宿主在本机显示该路径(文件在所在目录中被选中) |
| 桌面宿主,未实现 `revealPath` | 复制路径到剪贴板,并说明当前环境不支持打开本地文件管理器 |
| 普通浏览器 / 服务器 / 容器 / NAS | 同上:复制路径,不显示成失败 |

- 路径先由后端解析,**宿主不重新解析、不展开、不猜测路径**,只校验自己在本地
  能不能看到它;
- 路径还不在本机(全新安装,或后端在另一台机器上)时同样复制路径,而不是报错;
- 「复制路径」在服务器形态下是**主要**答案,不能因为桌面形态更好就把它藏起来:
  它是独立按钮(`CopyPathButton`),不是「打开文件夹」失败后的隐藏分支;
- 桌面宿主实现 `reveal_path` 的三处注册(ACL 清单 / capability / `generate_handler!`)
  见 `pixivflow-desktop` 的 `AGENTS.md`。

### 调用方:只经过能力层,不要直接探测宿主

页面与组件**不得**写 `if (window.pixivflowHost)`。分层是:

```
src/utils/hostCapabilities.ts   谁来完成这个设备动作(宿主 / 浏览器)
        ↓
src/utils/revealPath.ts         纯逻辑:先问后端路径,再决定显示或复制
        ↓
src/hooks/usePathActions.ts     统一的成功/失败文案(antd message)
        ↓
RevealPathButton / CopyPathButton
```

否则半年后 Files、History、Download 会各自判断 Tauri。
新增一个设备能力(clipboard / notification / openUrl / openExternal)应当只改
`hostCapabilities.ts` 与 `types/host-bridge.d.ts`,而不是每个页面。

### 复制路径也必须先经后端

`copyPath()` 复制的是 `GET /api/files/location` 解析出的**绝对路径**,不是调用方
传入的原始字符串:老版本写下的历史行可能仍是相对路径,直接复制会粘贴出一个在本机
并不存在的值。后端无法解析时(`FILE_PATH_INVALID`)不复制任何内容,按失败处理。

下载任务页的「文件保存路径」同样走该端点:配置里的 `storage.*Directory` 通常是
`./downloads/illustrations` 这样的相对值,既不能复制也不能直接打开,所以页面显示
后端解析后的绝对目录,并在目录尚未创建时把两个按钮置灰(`download.pathNotCreatedYet`)。

## 约束

- 不要为某个宿主在产物里加入宿主专属分支或依赖;产物必须仍是任意静态服务器
  可直接托管、普通浏览器可直接使用的资源。桥接本身通过
  `window.pixivflowHost` 的能力探测接入,不含任何宿主专属依赖。
- 不要恢复仓库内的 Electron / Capacitor 打包(见 [构建选项](/BUILD_OPTIONS.md)),
  桌面宿主是**外部消费者**,其代码不在本仓库。
- 修改登录链路时,请同时确认「无宿主桥接」环境的降级行为仍然可用。

### `GET /api/files/location` 的响应形态

后端按**平铺**结构回答(与 `/files/recent` 一致,不套 `data` 信封):

```json
{"success":true,"path":"/downloads/illustrations/a.jpg",
 "directory":"/downloads/illustrations","exists":true,"isDirectory":false}
```

客户端因此读 `response.data.path`,不是 `response.data.data.path`。这个区别没有
类型能替你发现——写错时路径会静默变成 `undefined`(所有 mock 测试仍然通过),
只有真机点击才会暴露。
