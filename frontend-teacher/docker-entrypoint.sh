#!/bin/sh

# 替换环境变量 - 直接在所有JS文件中替换
echo "Setting API URL to: ${REACT_APP_API_URL:-http://localhost:3000}"
echo "Setting WS URL to: ${REACT_APP_WS_URL:-ws://localhost:3000}"

# 在所有静态JS文件中替换占位符和localhost为实际地址
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i \
  -e "s|REACT_APP_API_URL_PLACEHOLDER|${REACT_APP_API_URL:-http://localhost:3000}|g" \
  -e "s|REACT_APP_WS_URL_PLACEHOLDER|${REACT_APP_WS_URL:-ws://localhost:3000}|g" \
  -e "s|http://localhost:3000|${REACT_APP_API_URL:-http://localhost:3000}|g" \
  -e "s|ws://localhost:3000|${REACT_APP_WS_URL:-ws://localhost:3000}|g" \
  {} +

# 创建运行时配置
cat > /usr/share/nginx/html/runtime-config.js << EOF
window.RUNTIME_CONFIG = {
  REACT_APP_API_URL: "${REACT_APP_API_URL:-http://localhost:3000}",
  REACT_APP_WS_URL: "${REACT_APP_WS_URL:-ws://localhost:3000}"
};
EOF

# 启动nginx
nginx -g 'daemon off;'