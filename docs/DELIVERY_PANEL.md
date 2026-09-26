# 投递面板

> **English:** This document describes the Delivery panel at `/deliveries`. PixivFlow acts as a
> *messaging gateway client*: it acquires content, records a durable delivery ledger and calls an
> external gateway over HTTP. The panel is a **read-only projection** of that plane — it renders the
> configured gateway routes and the ledger through `GET /api/gateways`, `GET /api/gateways/:name`,
> `GET /api/gateways/:name/pairing`, `GET /api/deliveries` and `GET /api/deliveries/:id`.
> Pairing is a transparent relay to the gateway's own endpoint; the browser never generates a QR
> code, never runs a login protocol, never stores a session, and no response contains a credential.

## 功能概述

侧边栏「投递」菜单(`/deliveries` 路由)对应页面组件 `src/pages/Deliveries/Deliveries.tsx`。

这一页回答两个问题:

- **投递到哪** —— 配置里声明了哪些网关路由,每条路由能承载什么内容,以及 PixivFlow 最后一次观测到的连接状态;
- **投递发生了什么** —— 持久投递账本里,每个作品到每条路由的最终状态、尝试次数与失败原因。

页面**在构造上只读**:没有重试、没有取消、没有配对提交。重放一条失败路由是服务端运维动作(`pixivflow delivery retry`),不是浏览器按钮。

涉及的后端端点(注册于主仓库 `src/webui/routes/gateways.ts` 与 `src/webui/routes/deliveries.ts`):

| 端点 | 用途 | 写路径 |
| --- | --- | --- |
| `GET /api/gateways` | 全部路由 + 未匹配配置的残留连接记录 | 无 |
| `GET /api/gateways/:name` | 单条路由的声明能力、连接观测与最近投递记录 | 无 |
| `GET /api/gateways/:name/pairing` | **透传**网关自己的配对端点 | 无 |
| `GET /api/deliveries` | 跨路由投递账本(可按状态/路由/类型过滤) | 无 |
| `GET /api/deliveries/:id` | 单条投递意图 | 无 |

## 页面入口与布局

| 元素 | 实现位置 |
| --- | --- |
| 路由 `/deliveries` | `src/AppRoutes.tsx`,`React.lazy` 懒加载 |
| 侧边栏菜单项 | `LayoutSider.tsx`,menu key 为 `/deliveries`,图标 `SendOutlined` |
| 页面组件 | `src/pages/Deliveries/Deliveries.tsx` |
| 配对弹窗 | `src/pages/Deliveries/components/PairingDialog.tsx` |
| 数据获取 | `src/hooks/useGateways.ts`、`src/hooks/useDeliveries.ts` |
| 服务层 | `src/services/gatewayService.ts` |

页面顶部是一个 `ReloadOutlined` 刷新按钮(同时刷新两张表,不改变任何状态),下面是两个 Tab。

### Tab 1:网关

表格列:

| 列 | 数据来源 | 说明 |
| --- | --- | --- |
| 网关 | `gateways[].name` | 配置里 `delivery.targets` 的目标名;未启用时追加「未启用」标签 |
| 类型 | `gateways[].type` | Target 类型(`webhook`、`httpMultipart`、`telegram`…) |
| 端点 | `gateways[].endpoint` | **后端已脱敏**的 URL,前端不做二次处理 |
| 连接状态 | `gateways[].connectionStatus` | `unknown` / `unreachable` / `waiting` / `connected`,外加 `connectionUpdatedAt` |
| 能力 | `gateways[].capabilities.supported` | 平铺为标签,见下节 |
| 已投递/进行中/失败 | `gateways[].deliveryCounts` | `delivered/pending/failed` 三个计数 |
| (操作) | `gateways[].pairingSupported` | 仅当该行支持配对时显示「配对」链接 |

`unconfigured` 非空时,表格上方出现一条 info Alert。它列出**数据库里存在、但配置里已没有对应路由**的连接记录 —— 通常是删掉 target 后残留的行。这类悬挂指针被显式暴露而不是隐藏,因为静默忽略会让人以为「配置生效了」。

### Tab 2:投递历史

工具栏是「按状态筛选」「按网关筛选」两个 Select,以及当前账本的四个状态计数标签。表格列:

| 列 | 字段 | 说明 |
| --- | --- | --- |
| 网关 | `deliveryTarget` | 该条意图所属路由 |
| 作品 | `workType` + `pixivId` | 作品类型与 Pixiv 作品 ID |
| 投递状态 | `status` + `outboxStatus` | 账本状态;副行说明「发件箱里是否还有东西会去重试它」 |
| 尝试次数 | `attempts` | 已发生的投递尝试次数 |
| 失败原因 | `lastError` | provider 自己返回的简短原因,**不含凭据** |
| 来源 | `slotId` + `updatedAt` | 由哪个调度槽位产生,以及最后更新时间 |

`status` 的四个取值来自主仓库 `DeliveryRepository` 的 `DeliveryStatus`:

| 值 | 含义 |
| --- | --- |
| `pending` | 已登记意图,尚未确认投递成功 |
| `delivered` | 网关确认接收 |
| `duplicate` | 幂等命中:该「作品 + 路由」此前已投递过 |
| `failed` | 终态失败(**不会自动重试**;需运维显式 `delivery retry`) |

## 能力模型

每一行的「能力」标签来自后端 `resolveTargetCapabilities()` 的结果,而不是前端按平台名推断。这意味着:

- 一个新接入的、PixivFlow 还不认识的平台**只会声明 `text`**,并且 `truncatePolicy` 为 `error`(宁可失败也不静默截断)。面板必须如实显示这一点,而不是承诺该平台会接受媒体。
- 尺寸类限制只能收紧(`Math.min`),节奏类限制只能放宽(`Math.max`),所以配置里的覆盖值不会凭空放大平台上限。

页面展示的字段形状(与主仓库 `src/delivery/capabilities.ts` 的 `TargetCapabilities` 一致):

```json
{
  "type": "webhook",
  "supported": ["text", "image", "file", "album", "video"],
  "maxTextLength": 4096,
  "maxCaptionLength": 1024,
  "maxUploadBytes": 52428800,
  "maxAttachmentsPerMessage": 10,
  "album": { "min": 2, "max": 10 },
  "requiresTwoPhaseUpload": false,
  "minSendIntervalMs": 0,
  "truncatePolicy": "split",
  "idempotencyMechanism": "platform_key"
}
```

## 配对透传

「配对」按钮打开一个弹窗,它调用 `GET /api/gateways/:name/pairing`。这条端点的边界是**刻意**的:

- PixivFlow 不生成二维码、不说任何平台登录协议、不持有 session、不把读到的内容写进数据库;
- 网关自己暴露一个 HTTP 端点负责配对,PixivFlow 只 `GET` 它并把答案原样交给浏览器;
- 响应 schema 属于**网关**,不属于 PixivFlow —— PixivFlow 只在外面套一层来源信息(`fetchedAt`、`gateway`、`type`、`endpoint`、`pairable`)。

前端只识别能够安全展示的形状:以 `data:image/` 开头的字符串,或对象里的 `qrCode` / `qr_code` / `qrcode` / `dataUrl` / `data_url` / `image` 字段,或 `contentType` 为 `image/*` 且对象带 `base64`。**其余一律按文本/JSON 原文展示**,不做猜测。

三种状态在弹窗里被明确区分,不能互相冒充:

| 状态 | 表现 |
| --- | --- |
| 网关返回了配对载荷 | 渲染二维码(或原文),底部标注来源 |
| `pairable: false`(网关应答了,但说现在不能配对) | warning Alert + **保留网关自己的措辞**,而不是一句笼统的失败 |
| `errorCode: GATEWAY_PAIRING_UNSUPPORTED`(该路由没配 `pairingUrl`) | info Alert;这不是错误 |
| 传输失败 / 502 | warning Alert + 脱敏后的原因 |

## 只读契约与错误处理

- 页面**不含**任何重试、取消、提交验证码的路由调用;`gatewayService` 的方法名也不含 `retry`/`cancel`/`submit`/`pair`,并有单元测试守住这条边界。
- `/api/gateways` 系列响应永不包含 token、chat_id 或未脱敏端点;前端不缓存、不落盘配对结果。配对读取有 2 秒**进程内**缓存,由后端负责,且不持久化。
- 错误码经公共链路(`services/api/error-handler.ts` → `ApiError`)与 `translateErrorCode()` 按 i18n key `errorCodes.{CODE}` 翻译:

| errorCode | 场景 |
| --- | --- |
| `GATEWAY_LIST_FAILED` | 读取网关列表失败(500) |
| `GATEWAY_NOT_FOUND` | 路由不存在或名字不合法(404 / 400) |
| `GATEWAY_PAIRING_UNSUPPORTED` | 该路由未配置 `pairingUrl`(404) |
| `GATEWAY_PAIRING_UNAVAILABLE` | 网关的配对端点当前不可用(502 或网关自身的非 2xx) |
| `PAIRING_READ_FAILED` | 读取配对状态内部失败(500) |
| `DELIVERY_LIST_FAILED` | 读取投递记录失败(500) |
| `DELIVERY_NOT_FOUND` | 投递记录 ID 不存在(404 / 400) |
| `DELIVERY_STATUS_INVALID` | `status` 过滤值不在四个枚举内(400) |

除上表外,未登录 / 配置缺 Pixiv 凭据导致的 500(后端返回 `CONFIG_VALIDATION_PIXIV_*`)先经 `isAuthRequiredError()` 命中,页面改用 `LoginRequiredAlert`(说明 + 「立即登录」+ 重试)而不是通用错误条。

## 与后端的关系

本页面**不实现任何后端业务规则**,只渲染契约:

| 事实 | 权威来源 |
| --- | --- |
| 声明了哪些路由、每条路由的能力 | 配置(`delivery.targets`)经后端 `resolveTargetCapabilities()` 解析 |
| 连接状态 | PixivFlow 对网关配对状态的**最后一次观测**(允许过时;`unknown` = 还没观测过) |
| 投递状态、尝试次数、失败原因 | `deliveries` 表(持久投递账本) |
| 「还会不会自动重试」 | `outbox` 表的只读 join 结果(`outboxStatus`) |
| 配对载荷 | 网关自己 |

投递去重域是 `(delivery_target, work_type, pixiv_id)`:同一个作品发到两条路由是两条独立的账本行,一条失败不会影响另一条。这一点由后端保证,前端只如实展示。

## 相关文档

### 主仓库(PixivFlow)

- [投递运行时](https://github.com/redtidev1918/PixivFlow/blob/master/docs/architecture/delivery-runtime.md) — Source → Artifact → Delivery Engine → Target Adapter、投递账本、幂等与重试
- [外部网关对接手册](https://github.com/redtidev1918/PixivFlow/blob/master/docs/GATEWAY.md) — 网关侧如何实现 `webhook` 契约
- [API 参考](https://github.com/redtidev1918/PixivFlow/blob/master/docs/API.md) — 后端接口
- [配置说明](https://github.com/redtidev1918/PixivFlow/blob/master/docs/CONFIG.md) — `delivery.targets` 字段

### 本仓库

- [DEVELOPMENT_GUIDE](DEVELOPMENT_GUIDE.md) — 前端开发流程
- [COMPONENT_GUIDE](COMPONENT_GUIDE.md) — 共享组件与页面组件清单
- [项目 README](https://github.com/redtidev1918/pixivflow-webui/blob/master/README.md) — 快速开始
