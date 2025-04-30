FROM node:alpine as builder
EXPOSE 80
ARG ENVIRONMENT="production"

WORKDIR /app

COPY . /app
RUN npm install -g @angular/cli && \
  npm install && \
  ng build --configuration=${ENVIRONMENT}

FROM nginx:alpine
LABEL org.opencontainers.image.authors "Slavik Svyrydiuk <slavik@svyrydiuk.eu>"
LABEL org.opencontainers.image.source "https://github.com/trineracz/CDK-klient"
COPY --from=builder \
  /app/dist/cdk-client/browser/ /usr/share/nginx/html
COPY docker/etc/nginx/conf.d/default.conf /etc/nginx/conf.d/
# FIXME probably these 2 lines are not needed while building
# on github CI/CD
RUN find /usr/share/nginx/html -type d -exec chmod 0755 {} \; && \
    find /usr/share/nginx/html -type f -exec chmod 0644 {} \;
