#!/bin/sh

# 替换环境变量
if [ -n "$REACT_APP_API_URL" ]; then
  sed -i "s|REACT_APP_API_URL_PLACEHOLDER|$REACT_APP_API_URL|g" /usr/share/nginx/html/env-config.js
fi

if [ -n "$REACT_APP_WS_URL" ]; then
  sed -i "s|REACT_APP_WS_URL_PLACEHOLDER|$REACT_APP_WS_URL|g" /usr/share/nginx/html/env-config.js
fi

# 启动nginx
nginx -g 'daemon off;'