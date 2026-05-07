FROM node:alpine AS builder

LABEL org.opencontainers.image.source="https://github.com/trineracz/CDK-klient"

WORKDIR /app

# přidej git do builderu kvůli collect-build-info.js
RUN apk add --no-cache git

COPY . /app

# zkopíruj .git kvůli collect-build-info.js
COPY .git /app/.git

RUN npm install -g @angular/cli && \
    npm install && \
    npm run build

FROM nginx:alpine

EXPOSE 80

COPY --from=builder \
    /app/dist/cdk-client/browser/ /usr/share/nginx/html/

# defaultní local-config mimo Angular build
COPY --from=builder \
    /app/public/local-config/ /usr/share/nginx/local-config/

COPY docker/etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# add `mjs` to application/javascript mimetype
RUN sed -i '/javascript/ s/;$/ mjs;/' /etc/nginx/mime.types

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN find /usr/share/nginx/html -type d -exec chmod 0755 {} \; && \
    find /usr/share/nginx/html -type f -exec chmod 0644 {} \; && \
    find /usr/share/nginx/local-config -type d -exec chmod 0755 {} \; && \
    find /usr/share/nginx/local-config -type f -exec chmod 0644 {} \;

ENTRYPOINT ["/entrypoint.sh"]