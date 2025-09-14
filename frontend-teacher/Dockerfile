# 多阶段构建
# 阶段1: 构建应用
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package files
COPY package*.json ./

# 安装依赖
RUN npm ci --legacy-peer-deps && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 阶段2: 运行时环境
FROM nginx:alpine

# 复制构建产物到nginx
COPY --from=builder /app/build /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]