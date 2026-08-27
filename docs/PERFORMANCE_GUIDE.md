# PixivFlow WebUI 性能指南

> **English:** This guide documents the performance mechanisms that already exist in the codebase — route-level code splitting, TanStack Query caching, the shared Socket.IO connection, and polling fallbacks — and turns today's measurements into concrete budgets. It closes with an anti-regression checklist covering large-list rendering, memo usage, cache invalidation granularity, and socket lifetime. All numbers come from a production build of this repository (`npm run build`); re-measure before comparing against them.

## 现状机制

### 代码分割

`src/AppRoutes.tsx` 对全部 8 个页面做 `React.lazy()` + `Suspense`(fallback 为 LoadingSpinner),路由级 chunk 由 Vite 自动产出。`dist/index.html` 只引用一个入口 script 和一份 CSS,没有 modulepreload 列表,其余 chunk 在导航时按需拉取。

对当前 `npm run build` 产物的实测(sourcemap 开启,.map 仅在 DevTools 主动请求时才下载,不计入正常加载):

| 产物 | 原始大小 | gzip 后 | 说明 |
| --- | --- | --- | --- |
| `index-CVaAX4oJ.js` | 854 KB | **277 KB** | 唯一首屏 JS(React、AntD、React Query、i18next、axios 等) |
| `index-DHwJxrFi.css` | 2.7 KB | **~1.1 KB** | 全局样式 |
| `useErrorHandler-*.js` | 167 KB | 54 KB | 异步共享 chunk(最大懒加载块) |
| `index-C_TivnoY.js` | 122 KB | 40 KB | 文件名不含语义的共享 chunk |
| `row-*.js` / `index-tHP17u-B.js` | 67 / 62 KB | 21 / 19 KB | 同类共享 chunk |
| `Config-*.js` | 65 KB | 19 KB | Config 页 chunk |
| `Files-*.js` | 55 KB | 19 KB | Files 页 chunk |
| `socket-*.js` | 41.5 KB | 13 KB | socket.io-client(首个用到实时通道的页面才加载) |
| `errorCodeTranslator-*.js` | 20 KB | 7.2 KB | 错误码翻译表,独立分包 |
| `Download-*.js` / `UrlDownload-*.js` | 21 / 19 KB | 6.7 / 6.1 KB | 下载相关页面 chunk |
| `useConfig-*.js` / `useDownload-*.js` | 15 / 4.5 KB | 5.2 / 1.6 KB | 共享 hook chunk |
| `Dashboard-*.js` | 2.3 KB | <1 KB | Dashboard 页壳 |
| 图标碎片(`CheckCircleOutlined-*` 等) | <2.5 KB | 更小 | 按图标拆分的最细粒度 chunk |

结论:

- 首屏成本集中在入口单包(未压缩 854 KB),History/Logs/Login 没有独立命名 chunk,内容混在共享 `index-*` 里——想继续压首屏,方向是拆入口依赖,而不是调页面分包;
- 图标级微 chunk 说明当前拆分粒度已经足够细,不需要手工配置 manualChunks。

### 首屏加载链路

1. 浏览器拉取 `index.html`(470 B)+ 入口 JS(gzip 约 277 KB)+ CSS(gzip 约 1.1 KB);
2. `main.tsx` 建 QueryClient(staleTime 5 分钟)、挂 ErrorBoundary → I18nProvider → App;
3. ProtectedRoute 发出第一个业务请求 `GET /api/auth/status`(`staleTime: 0`);
4. 认证通过后渲染 AppLayout 与默认页 Dashboard,按需加载对应页面 chunk。

### TanStack Query 缓存策略

全局默认(`src/main.tsx`):staleTime 5 分钟、gcTime 10 分钟、retry 1 次、关闭窗口聚焦重取。已读取过的列表数据在 5 分钟内二次进入页面不发请求。

特例与直写:

- 认证链路(ProtectedRoute 的 authStatus、useAuth、登录流)显式 `staleTime: 0`,登录状态永远现取;
- Socket 推送的 download 快照形状与 `GET /api/download/status` 相同,直接 `queryClient.setQueryData()` 写入缓存,一次推送替代一次轮询请求。

### 失效与写缓存映射

mutation 与实时事件对应的目标键失效关系(实现见 `src/hooks/useDownload.ts` 等):

| 触发 | 失效 / 写入目标 |
| --- | --- |
| start / stop 任务成功 | `['download','status']` |
| 任务 running → 终态(socket snapshot 判定) | `['stats']` + download history + incomplete tasks |
| resume incomplete task | incomplete tasks + `['download','status']` |
| delete incomplete task(s) | incomplete tasks |
| logs 频道收到 new 行 | `QUERY_KEYS.LOGS()`(initial 历史不触发) |

原则:`invalidateQueries` 带具体 queryKey 到资源级,禁止无 key 全量失效;推送与 REST 同形的数据优先 setQueryData 直写。

### Socket.IO 共享单连接

`src/services/socket.ts` 实现引用计数的懒创建连接:

- `acquireSocket()`:消费者计数 +1,首次调用才建立连接,`transports: ['websocket', 'polling']`;
- `releaseSocket()`:计数 -1,归零即 `close()`;
- 当前消费方只有两处:`useLogsRealtime`(logs 频道)与 `useDownloadStatus`(download 频道),各自在 effect cleanup 中释放槽位;
- 连接地址:开发模式为 `http://localhost:$VITE_DEV_API_PORT || 3000`;生产(`NODE_ENV=production`)解析为空串即同源相对连接,WebSocket 由后端 Express 提供。

注意端口逻辑在 socket.ts 与 vite.config.ts 各实现了一份(前者不用 `import.meta`,为了 Jest CJS 兼容),调整时要两处同步。

### 轮询兜底间隔

实时通道之外靠 refetchInterval 兜底(useDownload.ts 里注释原话:"Polling stays as a safety net")。现有取值都在调用点内联写死:

| 调用点 | 默认间隔 |
| --- | --- |
| `useDownloadStatus`(任务状态) | 2000 ms |
| `useDownloadLogs`(任务日志) | 2000 ms |
| `useStatsOverview`(Dashboard 统计) | 5000 ms |
| `useLayoutAuth`(顶栏认证状态刷新) | 30000 ms |

常量表 `REFRESH_INTERVALS`(DOWNLOAD_STATUS/TASK_LOGS 为 2000,CONFIG/LOGS 为 5000)已在 constants 定义,**但源码中没有任何引用**——实际生效的是上表的字面量。新增轮询时应把值收编进该表并引用,避免出现第三套数字。

## 性能预算建议

以下阈值按实测基线设定,目前没有 CI 卡口,属于人工把关线:

| 指标 | 预算 | 现状 | 余量 |
| --- | --- | --- | --- |
| 首屏 JS(gzip) | ≤ 400 KB | ~277 KB | ~44% |
| 首屏 CSS(gzip) | ≤ 10 KB | ~1.1 KB | 充足 |
| 单个异步 chunk(gzip) | ≤ 80 KB | 最大 ~54 KB | ~32% |
| 页面级 chunk | 每路由一个 lazy chunk | 8 个路由均有 | — |

执行方式:

- 引入新依赖前先 `npm run build` 对比入口体积;超过 10 KB gzip 的依赖必须给出按需加载或可拆包方案再合入;
- 新页面沿用 `lazy(() => import('./pages/X'))` 模式,禁止改成静态 import;
- 生产 sourcemap 保持开启是当前选择,.map 不影响运行时性能,静态托管侧可用访问控制挡住即可;
- 编辑器维持 `common/CodeEditor` 的 textarea 方案,不引入 Monaco/CodeMirror 级依赖(动辄数百 KB gzip,预算装不下);
- 图标从 `@ant-design/icons` 具名导入即可,构建器会按图标拆成微 chunk,不要整包引用图标模块;
- 触碰 vite.config.ts 或大依赖升级后,重新跑一遍下一节的复测流程并更新本文档数字。

复测命令:

```bash
npm run build
cd dist/assets
for f in *.js; do
  printf '%s %s %s\n' "$f" "$(stat -f%z "$f")" "$(gzip -c "$f" | wc -c)"
done | sort -k3 -n -r | head -10
```

## 防劣化清单

改动触及下列场景时逐条核对:

1. **长列表分页**:所有表格走 DataTable 分页(分页档位默认 10/20/50/100)。不要把无界数组直接塞给 Table——Logs 这类持续增长的流同样依赖分页窗口刷新,而不是整段渲染。
2. **保持列与配置引用稳定**:DataTable 内部 `processedColumns`/`getRowKey`/`paginationConfig` 已有 useMemo,但依赖是传入对象本身;columns 数组在 render 内联构造会让这层 memo 每次击穿。列定义提到组件外或用 useMemo 包一层,pagination 配置同理。
3. **memo 用在点子上**:已包 `React.memo` 的只有 TableFilters 与 FormModal;配合它们传 `useCallback` 化的回调才有收益。其余共享组件未 memo,不要盲加——先跑 `src/__tests__/performance/renderPerformance.test.tsx` 建立基线(50 行数据的渲染断言,上限 1000ms 是防病态回归的兜底值,不是达标线)。
4. **Socket 生命周期成对**:`acquireSocket()` 必须有 cleanup 中的 `releaseSocket()`;否则消费者计数泄漏导致连接永不关闭。
5. **窄失效**:参照上面的失效映射表扩展新 mutation;实时到达的数据与 REST 同形时一律 setQueryData。
6. **轮询值收敛**:新增 refetchInterval 时把数值登记进 `REFRESH_INTERVALS` 并引用之;实时任务类维持 2000ms、统计类 5000ms 的现值风格。
7. **构建产物复查**:改 vite.config.ts、依赖树或入口文件后过一眼构建输出末尾的 chunk 清单——新页面的代码出现在 entry chunk 就是回归信号。
8. **高频输入先去抖**:搜索框类输入接现成的 `src/hooks/useDebounce.ts` 再写进查询参数,避免每个按键打一次接口或失效一轮缓存。

## 观测与验证入口

| 手段 | 入口 | 能看到什么 |
| --- | --- | --- |
| 构建产物 | `npm run build` 输出、`dist/assets/` | chunk 拆分与原始体积 |
| gzip 实测 | 上文的复测命令 | 各 chunk 的传输体积 |
| 渲染耗时 | `npx jest renderPerformance` | DataTable 渲染毫秒数(stdout 打印具体值) |
| e2e trace | `npm run test:e2e:report` | 失败重试附带的 trace、截图、录屏 |
| 运行时行为 | 浏览器 DevTools Network/WS 面板 | 轮询节奏、Socket.IO 帧频率、缓存命中的空请求 |

React Query DevTools 未安装,缓存命中与失效效果通过 Network 面板观察:5 分钟内二次进入页面应看到对应查询没有新请求。

## 相关文档

- [DEVELOPMENT_GUIDE](./DEVELOPMENT_GUIDE.md) — Vite 代理、Query/Zustand 约定
- [COMPONENT_GUIDE](./COMPONENT_GUIDE.md) — DataTable/TableFilters 的 props 与用法
- [E2E_TESTING_GUIDE](./E2E_TESTING_GUIDE.md) — 用 e2e 固化交互行为
- [BUILD_OPTIONS](./BUILD_OPTIONS.md) — 构建形态说明
- [../README.md](../README.md) — 项目定位
- [../README_EN.md](../README_EN.md) — English README
