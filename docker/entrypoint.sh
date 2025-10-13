#!/bin/sh

echo "Generating runtime environment file..."

cat <<EOF > /usr/share/nginx/html/assets/env.json
{
  "devMode": ${APP_DEV_MODE:-false},
  "environmentName": "${APP_ENV_NAME:-docker runtime}",
  "environmentCode": "${APP_ENV_CODE:-docker}",

  "krameriusId": "${APP_KRAMERIUS_ID}"  
}
EOF

echo "✔️  env.json generated."

exec nginx -g "daemon off;"
