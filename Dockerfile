# syntax=docker/dockerfile:1.7

# PixivFlow WebUI 前端：静态托管 + /api、/socket.io 反代到 PixivFlow WebUI 后端。

# ---------- 前端构建 ----------
FROM node:22-alpine AS builder
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --fund=false
COPY . .
# 生产构建注入 API 基址：默认空 = 同源（浏览器走下方 nginx 的 /api 反代）。
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# ---------- 运行：nginx 静态服务 + 反代 ----------
FROM nginx:1.27-alpine
# PixivFlow WebUI 后端地址（默认 host.docker.internal:3000，compose 已加
# host-gateway 映射，Linux 同样可用；后端需监听 0.0.0.0）。
ARG UPSTREAM_API=http://host.docker.internal:3000
ENV UPSTREAM_API=${UPSTREAM_API}
# 官方镜像入口会自动对 /etc/nginx/templates/*.template 做 envsubst 后生效
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /src/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
