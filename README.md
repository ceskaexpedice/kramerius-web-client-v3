# CDK Client

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.0.6. Later upgraded to Angular 19.

> **Which library does the client run as?**
> The client always runs as a **single** Kramerius instance, configured entirely
> by the files in [`public/local-config/`](public/local-config/) — read directly
> from that directory, with no per-library subfolder. The library code comes from
> `app.code` in `config-main.json`, and the backend from `api.baseUrl`. To run a
> different library, replace the files in `local-config/` (or mount your own — see
> [Running as your own library](#running-as-your-own-library)) and the config docs
> in [`docs/config/`](docs/config/).
>
> If `config-main.json` is missing or invalid, the app **does not start** and
> shows a configuration error — there is no built-in fallback library.

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

> **Selecting the library in dev mode.** The dev server reads config from
> `public/local-config/` — the same flat directory used everywhere. To run as a
> different library, replace the files in `public/local-config/` (the library
> code comes from `app.code` in `config-main.json`). No environment variable
> selects the library.

## Build & Run classic

### Build

The library the client runs as is determined by the files in
`public/local-config/` (read directly, no per-library subfolder), not by an
environment variable. Optionally set dev mode:

```shell
export APP_DEV_MODE=false
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

## Running as your own library

To run the client as **your own** library, you do **not** need to modify any
source code — just provide your config files in `public/local-config/`.

1. **Put your config files directly in** `public/local-config/`:

   ```text
   public/local-config/config-main.json       # required: app.code, api.baseUrl, i18n
   public/local-config/config-licenses.json    # optional
   public/local-config/config-homepage.json    # optional
   ```

   The format of each file is documented in [`docs/config/`](docs/config/).
   `config-main.json` is the only required file; the rest fall back to built-in
   defaults when omitted. If `config-main.json` is missing or invalid, the app
   does not start.

2. **Build & serve:**

   ```shell
   export APP_DEV_MODE=false
   npm run build
   npx serve dist/cdk-client/browser -l 8080
   ```

   The client starts as the instance defined by `app.code` and connects to the
   backend from `public/local-config/config-main.json` → `api.baseUrl`.

> **Note.** The backend the client talks to comes entirely from
> `config-main.json` (`api.baseUrl`). Always set `api.baseUrl` in your
> `config-main.json` — there is no hard-coded backend.

In Docker, the same files can be mounted at runtime instead of baked into the
image — see [Local configuration volume](#local-configuration-volume).

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
  trinera/cdk-client:1.0.0
```

Open in browser:

```text
http://localhost:1234
```

The library the container runs as comes from the config files it serves from
`local-config/`. Override the bundled configuration by mounting your own
directory:

```shell
docker run -p 1234:80 \
  -e APP_DEV_MODE=true \
  -v ./public/local-config:/usr/share/nginx/local-config:ro \
  trinera/cdk-client:1.0.0
```

#### Environment variables

The container can be configured using environment variables:

| Variable | Default | Description |
|---|---:|---|
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
      - APP_DEV_MODE=${APP_DEV_MODE:-true}
    volumes:
      # Optional: override the bundled default local configuration.
      - ./public/local-config:/usr/share/nginx/local-config:ro
    healthcheck:
      test: ["CMD", "wget", "--quiet", "-O", "/dev/stdout", "http://127.0.0.1/local-config/config-main.json"]
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
export APP_DEV_MODE=false

docker compose up -d
```

Alternatively, create a `.env` file next to `docker-compose.yml`:

```env
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
./public/local-config/config-main.json
```

will override the bundled file and will be served by nginx as:

```text
/local-config/config-main.json
```

The file can be checked from the host at:

```text
http://localhost:1234/local-config/config-main.json
```

If you do not need a custom local configuration, you can remove the `volumes` section from `docker-compose.yml`.
