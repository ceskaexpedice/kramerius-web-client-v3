#!/bin/sh

echo "Generating runtime environment file..."

cat <<EOF > /usr/share/nginx/html/assets/env.json
{
  "devMode": ${APP_DEV_MODE:-false},
  "environmentName": "${APP_ENV_NAME:-docker runtime}",
  "environmentCode": "${APP_ENV_CODE:-docker}",
  "useApiConfig": ${APP_USE_API_CONFIG:-false},
  "apiConfigBaseUrl": "${APP_API_CONFIG_BASE_URL:-}"
}
EOF

echo "✔️  env.json generated."

exec nginx -g "daemon off;"
