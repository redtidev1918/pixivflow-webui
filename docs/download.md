# 📥 下载 pixivflow-webui

**语言 / Language:** 中文 · [English](/en/download.md)

本页由 GitHub Actions 在每次发版时**自动更新**，始终指向最新 Release。

## 最新版本：`v1.0.1`（2026-09-09）

👉 [查看 Release 说明与校验和](https://github.com/redtidev1918/pixivflow-webui/releases/tag/v1.0.1)

PixivFlow WebUI 是 PixivFlow 的前端组件，**不单独分发安装包**——它以静态产物形式内置在 PixivFlow 的 Docker 镜像与 npm 包中。下面是三种获取方式。

## 1. 随 PixivFlow 一起使用（推荐）

前端产物已内置在 PixivFlow 官方镜像与 `pixivflow` npm 包中，安装主程序后直接启动 WebUI：

```bash
npm install -g pixivflow
pixivflow webui          # 监听 3000 端口，浏览器打开 http://localhost:3000
```

Docker 场景直接启用 compose 中的 `pixivflow-webui` 服务：

```bash
docker compose up -d pixivflow-webui
```

主程序下载方式见 [PixivFlow 下载页](https://github.com/redtidev1918/PixivFlow/blob/master/docs/download.md)。

## 2. 从源码构建静态产物

```bash
git clone https://github.com/redtidev1918/pixivflow-webui.git
cd pixivflow-webui
npm ci
npm run build            # 产物输出到 dist/
```

两种交付路径（静态托管 / 打进 PixivFlow Docker 镜像）与生效的环境变量见 [构建选项](/BUILD_OPTIONS.md)。

## 3. 发版记录

本仓库 Releases 只提供每次发版的元数据（`RELEASE-METADATA.json`），没有独立安装包：

<https://github.com/redtidev1918/pixivflow-webui/releases>

## 相关

- [PixivFlow 主仓库](https://github.com/redtidev1918/PixivFlow) —— 后端 CLI 与 Express 服务
- [文档中心](/)
- [English docs](/en/)

| 平台 | 文件 | 大小 | 下载 |
|---|---|---|---|
| 通用 | `RELEASE-METADATA.json` | 1 KB | [⬇️ 下载](https://github.com/redtidev1918/pixivflow-webui/releases/download/v1.0.1/RELEASE-METADATA.json) |
