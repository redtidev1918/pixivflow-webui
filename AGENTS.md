# AGENTS.md —— pixivflow-webui 是「PixivFlow 浏览器控制面前端」

写给任何进入本仓库的智能体或工程师。职责契约：本仓库负责 **PixivFlow 控制面 UI /
静态打包**，不是业务系统，也不持有生产状态。

## 一句话

本仓库产出 `pixivflow web` 所需的浏览器前端与静态构建，最终打进 PixivFlow npm 包（
`pixivflow/webui-frontend/dist`）。它只通过 PixivFlow WebUI API
（`/api/health`、`/api/config`、`/api/download`、`/api/stats`、`/api/logs`、
`/api/files`、`/api/scheduler` 等）读写执行平面。

## 硬约束

- **禁止**在 UI 前端引入第二套状态系统 / 第二数据库 / 第二个 scheduler。
  所有“事实”都来自 PixivFlow 只读 API；写操作只调已有 Recovery / Scheduler / 配置接口。
- **禁止**把 token、secret、refresh token、cookie、数据库路径、SQL、stack trace
  打进 bundle 或渲染到页面。敏感字段必须由服务端注入脱敏。
- 认证沿用 WebUI basic auth，默认 fail-closed；公网绑定无凭据时启动必须拒绝
  （`WEBUI_ALLOW_PUBLIC_NO_AUTH` 仅作显式逃生舱）。
- 每个 API 面板必须匹配一个真实、可验证的只读端点；宁可少一个面板也不要占位的假数据。
- 构件向后兼容：旧 PixivFlow 不带新字段时 UI 不能崩溃；新前端也须能被旧服务端安全忽略。

## 改完请自证

- 仓库自带前端测试（jest / playwright）全绿；`webui-frontend/dist` 构建必须成功。
- WebUI 只读 API（例如 `GET /api/scheduler`）必须能在 `pixivflow web` 起一个服务后真实返回。
