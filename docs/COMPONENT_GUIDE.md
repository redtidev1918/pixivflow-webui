# PixivFlow WebUI 组件指南

> **English:** This is the reference for every shared component in `src/components`. Components are grouped by location (app-level, common, forms, tables, modals), each with a one-line responsibility and its key props. Page-level component inventories show how pages compose these building blocks, and the closing checklist covers what a new component must satisfy: controlled state, keyboard accessibility, i18n keys, and tests. Page-specific components live under their page directory and follow the same conventions.

## 组件目录全景

```
src/components/
├── ErrorBoundary.tsx        # 根级错误边界(main.tsx 挂载)
├── I18nProvider.tsx         # AntD ConfigProvider + 语言映射
├── ProtectedRoute.tsx       # 认证包裹层(路由守卫)
├── Layout/
│   ├── AppLayout.tsx
│   ├── components/          # LayoutHeader、LayoutSider
│   └── hooks/               # useLayoutAuth
├── common/                  # CodeEditor、DateRangePicker、EmptyState、ErrorBoundary、
│                            # ErrorDisplay、FileUploader、LoadingSpinner、LoadingWrapper
├── forms/                   # FormField、FormSection、FormTabs(types.ts 定义公共类型)
├── tables/                  # DataTable、TableFilters、TablePagination(types.ts)
└── modals/                  # ConfirmModal、FormModal、PreviewModal
```

各分类目录都有 `index.ts` barrel 导出;新增组件记得同步更新。

## 应用级组件

| 组件 | 职责 | 关键 props |
| --- | --- | --- |
| `AppLayout` | 整体框架:Sider + Header + Content Outlet,主题 token 取背景色 | 无 props(useLayoutAuth 提供登录态与回调) |
| `LayoutHeader` | 顶栏:登录/登出/token 刷新按钮与用户名展示 | `isAuthenticated`、`isLoggingOut`、`isRefreshingToken`、`onLogin/onLogout/onRefreshToken`、`colorBgContainer` |
| `LayoutSider` | 侧边菜单,路由高亮 + 折叠 | `collapsed`、`onCollapse(collapsed)` |
| `ProtectedRoute` | 不做重定向:每次挂载请求 authStatus,未认证时原地渲染登录引导卡 | `children` |
| `ErrorBoundary`(根级) | 兜底 Result 页 + 「重新加载」按钮,展开可见 errorInfo | `children` |
| `I18nProvider` | 按 `i18n.language` 给 AntD 传 zh_CN/en_US locale | `children` |

注意区分两个 ErrorBoundary:`components/common/ErrorBoundary.tsx` 支持自定义 fallback/回调(见下表),根级那个只服务 App 外壳。

## common

| 组件 | 职责 | 关键 props |
| --- | --- | --- |
| `CodeEditor` | textarea 简易代码编辑器,带行号与复制按钮(非 Monaco) | `value`、`onChange(v)`、`language`(json/js/ts/yaml/xml/html/css/text)、`readOnly`、`placeholder`、`minHeight/maxHeight`、`showLineNumbers`、`showCopyButton` |
| `DateRangePicker` | AntD RangePicker 封装,value 固定为 `[Dayjs, Dayjs]` 二元组 | `value?`、`onChange(dates)`、`placeholder?: [string, string]`、`allowClear`;其余透传 RangePicker |
| `EmptyState` | Empty 封装,可在描述下挂动作按钮 | `description`(默认「暂无数据」,硬编码)、`action?: ReactNode`,其余透传 Empty |
| `ErrorBoundary`(common) | 类组件错误边界,fallback 可编程 | `children`、`fallback?(error, errorInfo)`、`onError?(error, errorInfo)`、`showDetails` |
| `ErrorDisplay` | 把 `AppError` 映射成 Alert/Result 展示 | `error: AppError`、`onRetry?`、`title?`、`subTitle?` |
| `FileUploader` | AntD Upload 封装,本地受控文件列表 | `accept`、`maxCount`、`maxSize`、`multiple`、`onChange(files)`、`onRemove(file)`、`fileList`、`buttonText`、`showFileList`、`customRequest`、`disabled` |
| `LoadingSpinner` | Spin 封装,可全屏覆盖 | `size`(small/default/large)、`tip`、`fullScreen`、`spinning` |
| `LoadingWrapper` | 条件渲染:loading 时显示 Spin/fallback | `loading`、`children`、`fallback?: ReactNode`、`tip`、`size` |

## forms

| 组件 | 职责 | 关键 props |
| --- | --- | --- |
| `FormField` | 单字段多形态渲染器,按 `type` 切换 Input/TextArea/InputNumber/Select/Switch/DatePicker 等 | `type`(input、textarea、number、select、switch、date、dateRange、password)、`options` / `optionGroups`(select 用)、`tooltip`、`min/max/step`、`rows`、`showCount/maxLength`、`allowClear`、`disabled`、`inputProps`;其余透传 Form.Item |
| `FormSection` | 分区容器:标题 + 可选描述,可折叠、可包 Card | `title`、`description?`、`collapsible`、`defaultCollapsed`、`card`、`extra?`(标题栏右侧动作) |
| `FormTabs` | 受控 Tabs 封装,配置页按 tab 拆表单用 | `items[]`(`{ key, label, children, icon?, disabled? }`)、`activeKey`、`onChange(key)`、`tabPosition`、`type`(line/card/editable-card) |

公共类型在 `src/components/forms/types.ts`(`FormSectionProps`、`FormTabsProps`)。

## tables

### DataTable

通用表格:AntD Table 的瘦封装,自动把声明式的 sortable/filterable 转换为 sorter/onFilter。

| prop | 类型 / 默认值 | 说明 |
| --- | --- | --- |
| `data` | `T[]` | 数据源(内部映射为 dataSource) |
| `columns` | `DataTableColumn<T>[]` | 扩展列定义:`sortable`、`filterable`、`filterOptions`、`onFilter`,未传 sorter 时按 dataIndex 自动生成比较器(字符串 localeCompare / 数值相减) |
| `pagination` | `boolean \| object` | true 时启用默认分页;`showSizeChanger`、`showTotal`、`pageSizeOptions = ['10','20','50','100']` |
| `rowKey` | `string \| (record) => string`,默认 `'id'` | 行键 |
| `rowSelection` | 同 AntD Table | 行选择 |
| `emptyText` / `emptyComponent` | string / ReactNode | 空态文案或整块自定义空态(经 EmptyState 渲染) |
| `scroll` / `size` / `bordered` / `style` / `className` | — | 透传 Table |

基本用法:

```tsx
const columns: DataTableColumn<TaskRow>[] = [
  { title: t('download.task.name'), dataIndex: 'name', sortable: true },
  { title: t('download.task.status'), dataIndex: 'status', filterable: true,
    filterOptions: [{ label: t('common.running'), value: 'running' }] },
];

<DataTable data={rows} columns={columns} rowKey="taskId" loading={isLoading} />
```

性能相关实现:`getRowKey`、`processedColumns`、`paginationConfig` 三处均有 `useMemo`,依赖分别是 `rowKey`、`columns`、`pagination`——调用方传入的 columns/pagination 若每次 render 新建,memo 会失效(见 [PERFORMANCE_GUIDE](./PERFORMANCE_GUIDE.md))。

### TableFilters(`React.memo` 包裹)

声明式筛选条,`values` 完全受控。

| prop | 说明 |
| --- | --- |
| `filters: TableFilterConfig[]` | `{ key, label, type: 'select'\|'input'\|'date'\|'dateRange'\|'number', options?, placeholder?, defaultValue?, required? }` |
| `values` | 当前值字典,dateRange 为 Dayjs 数组 |
| `onChange(values)` | 任一筛选项变化时整体回调 |
| `onReset` / `showReset` | 重置按钮及其回调 |

### TablePagination

独立分页器(不依赖 DataTable 时使用):`current`、`pageSize`、`total`、`onChange(page, pageSize)` 必填;`pageSizeOptions` 默认 `['10','20','50','100']`,`showTotal` 支持 boolean 或自定义渲染函数。本组件**没有** memo 包裹。

## modals

| 组件 | 职责 | 关键 props |
| --- | --- | --- |
| `ConfirmModal` | 确认框,图标和按钮色随 type 变化 | `content`、`onConfirm`(支持 async)、`onCancel?`、`type`(warning/danger/info/success)、`okText/cancelText`(默认 OK/Cancel)、`confirmLoading`;继承 ModalProps 但去掉 onOk/onCancel,开关用 `open` |
| `FormModal`(`React.memo` 包裹) | 表单对话框:接管校验、提交、重置 | `form`(Form.useForm 实例)、`onSubmit(values)`、`submitText/cancelText`、`submitLoading`、`initialValues`、`formLayout`(默认 vertical)、`formProps`、`resetOnCancel/resetOnSubmit`(默认 true) |
| `PreviewModal` | 预览框:image/text/json/custom 四种内容形态 | `type`、`content` 或 `imageUrl`、`loading`、`renderContent?`(完全自定义)、`width`(默认 800)、`showFooter`(默认 false);loading 态自带居中 Spin |

FormModal 典型接法:

```tsx
const [form] = Form.useForm();
<FormModal form={form} open={open} title={t('config.target.add')}
  submitText={t('common.submit')} onSubmit={handleAdd} onCancel={close}>
  <FormField name="name" label={t('config.target.name')} rules={[{ required: true }]} />
</FormModal>
```

三个 modal 都通过 `open` 受控,默认按钮文案是英文硬编码——使用时必须显式传入 `t()` 文案。

## 组合约定(加载 / 错误 / 确认)

组件拼装的固定套路,新代码照此办理:

- **加载态**:useQuery 的 `isLoading` 交给 `LoadingWrapper`(有旧数据时保留内容)或 `LoadingSpinner`(整块占位);路由级懒加载的 fallback 由 AppRoutes 统一给 `LoadingSpinner`,页面里不用再包一层 Suspense;
- **错误态**:mutation 的 `onError` 里调 `useErrorHandler().handleError(error)` 统一入队提示;查询失败要内联展示时用 `ErrorDisplay`(error 是拦截器规范化后的 `AppError`,自带 code 与翻译后的 message);`onRetry` 接查询的 `refetch`;
- **危险操作**:删除、清空一律走 `ConfirmModal` 且 `type="danger"`,确认回调传 async 函数可自动接管 loading;
- **弹窗表单**:新增/编辑对话框统一用 `FormModal`,不要手写 Modal + Form 的双层状态;
- **空态**:表格交给 DataTable 的 `emptyText`;卡片布局用 `EmptyState` 并通过 `action` 引导下一步操作;
- **筛选组合**:顶部条件栏用 `TableFilters` 受控,值变化后写回分页参数并触发对应的查询 hook,不要在 Table 内部筛一遍、接口再筛一遍。

## 页面组织约定

每个页面目录结构与 Config 页一致,是改造新页面的模板:

```
src/pages/X/
├── X.tsx            # 页面壳,组合 hooks 与子组件
├── index.ts         # re-export 页面组件(AppRoutes lazy() 以此为入口)
├── components/      # 仅本页使用的 UI 子组件
└── hooks/           # 仅本页的状态逻辑(命名 useXxx)
```

跨页面复用的数据逻辑放 `src/hooks/`(useAuth、useDownload、useStats……),数据获取统一走这些 hook 和 `QUERY_KEYS`;页面内不再直接调 axios。现有页面与其子组件分布:

| 页面 | components/ 子组件(节选) | 局部 hooks |
| --- | --- | --- |
| Config | BasicConfigForm、DownloadConfigForm、NetworkConfigForm、SchedulerConfigForm、StorageConfigForm、TargetsConfigForm(+ targets/)、ConfigJsonEditor、ConfigPreviewModal、TargetModal 等 | useConfigForm、useConfigOperations、useConfigModals、useConfigTabs |
| Download | ActiveTaskCard、StartDownloadModal、TaskActions、TaskHistoryTable、TaskLogsViewer、TaskStatistics、IncompleteTasksTable | useDownloadOperations、useDownloadStatistics |
| Files | FileBrowser、FileFilters、FileList、FilePreview、FileStatistics、NormalizeFilesModal | useFileBrowser、useFileFilters、useFileOperations、useFileStatistics |
| History | HistoryTable、HistoryFilters、HistoryStatistics、HistoryExportMenu | —(逻辑在页面内与共享 hooks) |
| Logs | LogsTable、LogsControls、LogsFilters、LogsStatistics | useLogsRealtime(Socket 订阅) |
| Login | LoginCard、LoginForm、LoginModeSelector、LoginSteps、LoginFeatures、LoginHeader | useLoginFlow |
| Dashboard / UrlDownload | 单文件实现 | — |

新增页面时优先复用上表的既有子组件模式,而不是另起炉灶写表格和弹窗。

## 新增组件检查清单

- [ ] **受控优先**:值与变更由父级持有(value/onChange 或 open 等价物),组件自身不藏状态;
- [ ] **props 显式类型**:导出 `interface XxxProps`,扩展 AntD 原生 props 时用 Omit 明确排除冲突项;
- [ ] **键盘可达**:直接基于 AntD 组件即可满足;自绘交互(div onClick)必须换成 button 或补 tabIndex/键盘事件,jest-axe 测试不得引入新违例;
- [ ] **i18n**:所有面向用户的文案走 `t('ns.key')`,zh-CN 与 en-US 两边同时加 key,`node check-translations.js` 通过;不给 default 值留硬编码中/英文;
- [ ] **样式**:颜色/间距从 `theme.useToken()` 取,不写死色值;
- [ ] **导出**:加入所在分类的 `index.ts` barrel,named export;
- [ ] **测试**:至少一条 RTL 渲染断言 + 关键交互用例,文件放 `src/__tests__/<分类>/`;现有共享组件全部有对应测试,可作为样板;
- [ ] **性能**:长列表交给 DataTable 分页;给 memo 化组件(TableFilters、FormModal)传的回调用 useCallback 保持引用稳定;改动后跑 `npm run test -- renderPerformance` 确认无回归。

## 相关文档

- [DEVELOPMENT_GUIDE](./DEVELOPMENT_GUIDE.md) — 开发环境、状态管理与提交规范
- [PERFORMANCE_GUIDE](./PERFORMANCE_GUIDE.md) — 渲染与缓存层面的性能约定
- [URL_DOWNLOAD_FEATURE](./URL_DOWNLOAD_FEATURE.md) — URL 下载页的页面级实现示例
- [E2E_TESTING_GUIDE](./E2E_TESTING_GUIDE.md) — 页面级流程测试写法
- [../README.md](../README.md) — 项目定位与技术栈总览
