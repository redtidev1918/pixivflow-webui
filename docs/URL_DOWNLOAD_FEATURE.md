# URL 直接下载

> **English:** This document describes the URL direct-download feature: submitting Pixiv URLs or bare work IDs to start downloads without editing config targets. The frontend page lives at `/url-download` and talks to three backend endpoints: `POST /api/download/url`, `POST /api/download/batch-url`, and `POST /api/download/parse-url`. A reference table lists every URL shape the backend parser recognizes and, importantly, which of them each layer actually accepts. Error responses carry machine-readable `errorCode` values that map to localized messages.

## 功能概述

侧边栏「URL 下载」菜单(`/url-download` 路由)对应页面组件 `src/pages/UrlDownload.tsx`,粘贴 Pixiv 链接或裸作品 ID 即可直接创建下载任务,无需修改配置文件中的 targets。

涉及的后端端点(注册于主仓库 `src/webui/routes/download.ts`):

| 端点 | 入参 | 用途 |
| --- | --- | --- |
| `POST /api/download/parse-url` | `{ url }` | 仅解析校验,不建任务;始终返回 HTTP 200,以 `data.success` 区分结果 |
| `POST /api/download/url` | `{ url }` | 单个链接建任务 |
| `POST /api/download/batch-url` | `{ urls: string[] }` | 多个链接合并为一个任务 |

## 支持的 URL 形态

后端有两套解析实现:

- 共享解析器 `PixivFlow/src/utils/pixiv-url-parser.ts`:识别下表全部 10 种形态,当前仅被 CLI 的 `DownloadCommand` 与单元测试引用。
- WebUI 处理器内置精简版解析器(`download-url-handlers.ts`):`/api/download/*` 三个端点实际使用的是它。

| # | 形态 | 示例 | 解析为 | WebUI 端点 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 1 | 裸作品 ID | `123456` | 插画 | 支持 | 纯数字输入按插画处理 |
| 2 | 标准插画页 | `https://www.pixiv.net/artworks/123456` | 插画 | 支持 | 正则含路径中任意前缀段 |
| 3 | 带语言前缀 | `https://www.pixiv.net/en/artworks/123456` | 插画 | 支持 | `zh-cn` 等语言段同样命中规则 2 的正则 |
| 4 | 短链 | `pixiv.net/i/123456` | 插画 | 支持 | 路径须恰好为 `/i/{id}` |
| 5 | 旧版链接 | `member_illust.php?mode=medium&illust_id=123456` | 插画 | 支持 | 取 query 参数 `illust_id` |
| 6 | 小说页 | `novel/show.php?id=123456` | 小说 | 支持 | 路径含 `/novel/` 且 query 带 `id` |
| 7 | 小说系列 | `novel/series/123456` | 系列(series) | 支持 | 整部收取,目标标签记为 `series-{id}` |
| 8 | 用户主页 | `users/123456` | 用户(user) | 支持 | 默认收其全部插画(可指定小说) |
| 9 | 用户插画 / 小说页 | `users/{uid}/artworks/{id}` · `users/{uid}/novels/{id}` | 插画/小说 | 支持 | 精确到单作品 |
| 10 | 用户作品页 | `users/123456/artworks/789012` | 插画(取作品 ID) | 支持 | 忽略用户 ID,只取作品 |

通用规则:

- hostname 含 `pixiv.net` 或 `pixiv.org` 才会被解析;协议可省略,解析失败会自动补 `https://` 重试。
- 输入会先去除首尾空白与末尾斜杠。
- 非 URL 字符串走兜底提取:依次匹配 `artworks {id}`、`novel …{id}`、`series {id}`、`users {id}` 文本片段;最后回退到「任意 6 位以上数字按插画 ID」。
- 规则 7–10 在页面的「使用说明」卡片中未列出,属于 CLI 能力范围;WebUI 端点收到这类输入会原样拒绝。

## 页面入口与布局

| 元素 | 实现位置 |
| --- | --- |
| 路由 `/url-download` | `src/AppRoutes.tsx`,`React.lazy` 懒加载 |
| 侧边栏菜单项 | `LayoutSider.tsx`,menu key 为 `/url-download`,文案「URL 下载」 |
| 页面组件 | `src/pages/UrlDownload.tsx`(单文件组件) |
| 布局 | `Row/Col` 两栏:`xs=24`、`lg=12`,窄屏纵向堆叠 |
| 文案 | `src/locales/{zh-CN,en-US}.json` 的 `download.urlDownload.*` |

「使用说明」卡片固定列出页面支持的 7 种输入示例(上表 #1–#6 加裸 ID),并提示批量输入每行一条。

## 单个下载流程

页面左侧「单个下载」卡片:

1. 在输入框粘贴 URL 或 ID(placeholder:`例如: https://www.pixiv.net/artworks/123456 或直接输入 123456`)。按 Enter 等价于点「立即下载」。
2. 可选:点「解析 URL」调用 `parse-url`。成功时绿色 Alert 显示作品 ID 与作品类型标签(蓝=插画,绿=小说);失败时红色 Alert 以 `pre-line` 展示后端返回的多行 message。
3. 点卡片右上角「立即下载」调用 `POST /api/download/url`。
4. 成功后 toast「下载任务已启动」,1 秒后自动跳转 `/download` 查看进度。

任务由后端生成,taskId 形如 `url_task_{时间戳}`;后端用临时配置(`targets` 只含该作品)启动任务。

## 批量下载流程

右侧「批量下载」卡片:

1. TextArea(6 行)每行粘贴一条 URL 或 ID。
2. 点「解析所有 URL」。前端对每一行**串行**调用 `parse-url`(逐条请求,非一次批量),统计有效/无效数量。
3. 结果展示在下方「URL 列表」:有效项带 ✓ 图标与 ID/类型标签,无效项带 ✗ 与错误原因;每项可单独「移除」,也可「清空」全部。
4. 点「下载全部 (N)」(N 为上一步统计的有效条数),把有效行提交给 `POST /api/download/batch-url`,成功后同样跳转 `/download`。

批量响应字段:

```json
{
  "success": true,
  "taskId": "batch_url_task_1700000000000",
  "totalUrls": 3,
  "validUrls": 2,
  "invalidUrls": 1,
  "targets": [{ "url": "…", "workId": "123456", "workType": "illustration" }],
  "errorCode": "DOWNLOAD_START_SUCCESS"
}
```

注意:无效条目在提交时已被前端过滤,后端的 `validUrls/invalidUrls` 统计对应的是提交数组本身。

## 错误反馈格式

带 errorCode 的响应结构(`errorCode` 枚举见主仓库 `src/webui/utils/error-codes.ts`):

```json
{
  "errorCode": "INVALID_REQUEST",
  "message": "Invalid Pixiv URL or ID. Supported formats: https://www.pixiv.net/artworks/123456 or just 123456"
}
```

| 场景 | HTTP | errorCode |
| --- | --- | --- |
| 缺少 url 字段 / 全部无法解析 | 400 | `INVALID_REQUEST` |
| 已有任务在跑(`hasActiveTask()`) | 409 | `DOWNLOAD_TASK_ALREADY_RUNNING` |
| 任务启动抛错 | 500 | `DOWNLOAD_START_FAILED` |
| 解析成功 | 200 | 附 `DOWNLOAD_START_SUCCESS` |
| `parse-url` 失败 | 200 | HTTP 恒为 200,靠 `data.success=false` + `errorCode=INVALID_REQUEST` 判断 |

前端处理分两层:

- 页面内直接取 `response.data.message`(或 axios 错误的 `response.data.message`)塞进 toast 与 Alert;
- 公共链路经 `services/api/error-handler.ts` 包装成 `ApiError(code/message/statusCode)`,工具函数 `translateErrorCode()` 按 i18n key `errorCodes.{CODE}` 翻译,找不到翻译时回退原文或 errorCode 本身。

同一时刻只能有一个下载任务,409 提示在后端完成当前任务前都会出现。

## 进度查看

任务创建后,页面跳转的 `/download` 通过 Socket.IO 接收实时推送:`src/hooks/useDownload.ts` 订阅 `download` 事件,收到的快照 payload 结构与 `GET /api/download/status` 一致,包含活动任务、内存中的近期任务列表与最近日志(活动任务日志截取最近 40 条)。已完成任务的历史补齐仍依赖 REST 接口。

## 相关文档

### 主仓库(PixivFlow)

- [URL 语法口径](https://github.com/redtidev1918/PixivFlow/blob/master/docs/USAGE.md) —— CLI 与 WebUI 共用同一解析器
- [targets 字段](https://github.com/redtidev1918/PixivFlow/blob/master/docs/CONFIG.md) —— 解析结果如何映射为下载目标

### 主仓库(PixivFlow)

- [URL 语法口径](https://github.com/redtidev1918/PixivFlow/blob/master/docs/USAGE.md) —— CLI 与 WebUI 共用同一解析器
- [targets 字段](https://github.com/redtidev1918/PixivFlow/blob/master/docs/CONFIG.md) —— 解析结果如何映射为下载目标

- [DEVELOPMENT_GUIDE](DEVELOPMENT_GUIDE.md) — 前端开发流程
- [E2E_TESTING_GUIDE](E2E_TESTING_GUIDE.md) — 端到端测试
- [项目 README](../README.md) — 快速开始
- [API 参考](https://github.com/redtidev1918/PixivFlow/blob/master/docs/API.md) — 后端接口(主仓库文档)
