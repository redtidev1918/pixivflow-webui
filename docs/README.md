# PixivFlow WebUI 文档中心

> **English:** This is the documentation hub for PixivFlow WebUI, the modern
> React frontend for PixivFlow. New here? Follow
> [开发指南](DEVELOPMENT_GUIDE.md) → [组件指南](COMPONENT_GUIDE.md).
> Everything ships through [构建选项](BUILD_OPTIONS.md); quality is kept in
> check by [E2E 测试指南](E2E_TESTING_GUIDE.md) and
> [性能指南](PERFORMANCE_GUIDE.md).

PixivFlow WebUI 是 PixivFlow 的现代化 React 前端（React 18 + Ant Design 5）。
这里汇聚全部文档，按你的目标选择一条路线：

## 🧭 按任务找文档

| 你想做什么 | 路线 |
| --- | --- |
| 搭建本地开发环境、跑起前端 | [开发指南](DEVELOPMENT_GUIDE.md) |
| 了解各个组件的职责与用法 | [组件指南](COMPONENT_GUIDE.md) |
| 选择构建/发布方式、了解环境变量 | [构建选项](BUILD_OPTIONS.md) |
| 定位并守住性能预算 | [性能指南](PERFORMANCE_GUIDE.md) |
| 运行 Playwright 端到端测试 | [E2E 测试指南](E2E_TESTING_GUIDE.md) |
| 使用 URL 直接下载功能 | [URL 直接下载](URL_DOWNLOAD_FEATURE.md) |

## 📚 全部文档

### 开发

| 文档 | 内容 |
| --- | --- |
| [DEVELOPMENT_GUIDE](DEVELOPMENT_GUIDE.md) | npm 脚本、Vite 代理、状态管理（TanStack Query + Zustand）、i18n、代码规范与测试 |

### 组件

| 文档 | 内容 |
| --- | --- |
| [COMPONENT_GUIDE](COMPONENT_GUIDE.md) | `src/components` 下所有共享组件的职责、关键 props 与页面级组件清单 |

### 构建

| 文档 | 内容 |
| --- | --- |
| [BUILD_OPTIONS](BUILD_OPTIONS.md) | 两种交付路径（`npm run build` 静态产物 / 打进 PixivFlow Docker 镜像）与生效的环境变量 |

### 性能

| 文档 | 内容 |
| --- | --- |
| [PERFORMANCE_GUIDE](PERFORMANCE_GUIDE.md) | 路由级代码分割、TanStack Query 缓存、Socket.IO 连接复用与反回归清单 |

### 测试

| 文档 | 内容 |
| --- | --- |
| [E2E_TESTING_GUIDE](E2E_TESTING_GUIDE.md) | Playwright 套件的运行方式、认证重置机制与选择器约定 |

### 功能

| 文档 | 内容 |
| --- | --- |
| [URL_DOWNLOAD_FEATURE](URL_DOWNLOAD_FEATURE.md) | URL 直接下载：前端页面、后端端点、URL 形状对照表与错误码 |

## 🔗 其他入口

| 入口 | 说明 |
| --- | --- |
| [GitHub 仓库](https://github.com/redtidev1918/pixivflow-webui) | 本仓库源码 |
| [PixivFlow 主仓库](https://github.com/redtidev1918/PixivFlow) | 后端 CLI + Express 与文档站点 |
| [npm](https://www.npmjs.com/) | 前端依赖与发版信息 |
