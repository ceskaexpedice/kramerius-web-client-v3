# CDK Client

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.0.6. Later upgraded to Angular 19.

## Run for development

```shell
npm run start
```

Starts a local development server.

Open in browser:

```text
http://localhost:4200/
```

The application will automatically reload when source files change.

## Build & Run classic

### Build

First define the configuration using environment variables:

```shell
export APP_DEV_MODE=false
export APP_KRAMERIUS_ID="mzk"
```

Run the build:

```shell
npm run build
```

The build artifacts will be stored in the `dist/` directory.

The environment configuration from `APP_*` variables will be stored into:

```text
dist/cdk-client/browser/assets/env.json
```

### Run

To test the application you have just built, run:

```shell
npx serve dist/cdk-client/browser -l 8080
```

Open in browser:

```text
http://localhost:8080
```

## Build & Run with Docker

### Build image

```shell
docker build -t trinera/cdk-client:1.0.0 .
```

### Build & push (multiplatform) image to Docker Hub

```shell
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t trinera/cdk-client:1.0.0 \
  --push .
```

### Run container with `docker run`

```shell
docker run -p 1234:80 \
  -e APP_DEV_MODE=true \
  -e APP_KRAMERIUS_ID=mzk \
  trinera/cdk-client:1.0.0
```

Open in browser:

```text
http://localhost:1234
```

Optionally, override the bundled local configuration by mounting a local directory:

```shell
docker run -p 1234:80 \
  -e APP_DEV_MODE=true \
  -e APP_KRAMERIUS_ID=mzk \
  -v ./public/local-config:/usr/share/nginx/local-config:ro \
  trinera/cdk-client:1.0.0
```

#### Environment variables

The container can be configured using environment variables:

| Variable | Default | Description |
|---|---:|---|
| `APP_KRAMERIUS_ID` | `mzk` | ID of the default Kramerius instance. |
| `APP_DEV_MODE` | `true` | Enables or disables development mode. |

## Run with Docker Compose

Create a `docker-compose.yml` file:

```yaml
services:
  cdk-client:
    image: trinera/cdk-client:1.0.0
    ports:
      - "1234:80"
    environment:
      - APP_KRAMERIUS_ID=${APP_KRAMERIUS_ID:-mzk}
      - APP_DEV_MODE=${APP_DEV_MODE:-true}
    volumes:
      # Optional: override the bundled default local configuration.
      - ./public/local-config:/usr/share/nginx/local-config:ro
    healthcheck:
      test: ["CMD", "wget", "--quiet", "-O", "/dev/stdout", "http://127.0.0.1/local-config/libraries.json"]
      start_period: 30s
      interval: 30s
      timeout: 5s
      retries: 3
```

Start the application:

```shell
docker compose up -d
```

Stop the application:

```shell
docker compose down
```

Open in browser:

```text
http://localhost:1234
```

### Docker Compose environment variables

The values can be overridden before starting Docker Compose:

```shell
export APP_KRAMERIUS_ID=mzk
export APP_DEV_MODE=false

docker compose up -d
```

Alternatively, create a `.env` file next to `docker-compose.yml`:

```env
APP_KRAMERIUS_ID=mzk
APP_DEV_MODE=false
```

Docker Compose will automatically use these values.

### Local configuration volume

The Docker image contains a default version of the local configuration files.

Optionally, the default configuration can be overridden by mounting a local directory from the host:

```yaml
volumes:
  - ./public/local-config:/usr/share/nginx/local-config:ro
```

This maps local configuration files from:

```text
./public/local-config
```

to the container path:

```text
/usr/share/nginx/local-config
```

The volume is mounted as read-only using the `:ro` suffix.

This allows the container image to work out of the box with the bundled default configuration, while still allowing the runtime configuration to be provided externally when needed.

For example, the following local file:

```text
./public/local-config/libraries.json
```

will override the bundled file and will be served by nginx as:

```text
/local-config/libraries.json
```

The file can be checked from the host at:

```text
http://localhost:1234/local-config/libraries.json
```

If you do not need a custom local configuration, you can remove the `volumes` section from `docker-compose.yml`.