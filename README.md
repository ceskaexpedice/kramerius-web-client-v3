# CDK Client

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.0.6. Later upgraded to Angular 19.

> **Which library does the client run as?**
> The client always runs as a **single** Kramerius instance. Which one is selected
> by the `APP_KRAMERIUS_ID` environment variable, whose value must match a directory
> under [`public/local-config/`](public/local-config/) (e.g. `mzk`, `cdk`, `nm`).
> If you run a different library, create your own config directory there first —
> see [Running as your own library](#running-as-your-own-library) and the config
> docs in [`docs/config/`](docs/config/). When `APP_KRAMERIUS_ID` is not set, the
> client falls back to `cdk`.

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

> **Selecting the library in dev mode.** `npm run start` does **not** read
> `APP_KRAMERIUS_ID` — the dev server uses `src/environments/environment.local.ts`
> (auto-created on first run from `environment.ts`, git-ignored). To run the dev
> server as a specific library, set `krameriusId` in that file:
>
> ```ts
> export const environment = {
>   useStaticRuntimeConfig: false,
>   krameriusId: 'xy', // your library code under public/local-config/
>   // ...
> };
> ```
>
> Without it, `krameriusId` is empty and the dev server falls back to `cdk`.
> (For a production-like run that *does* honor `APP_KRAMERIUS_ID`, use the
> build below.)

## Build & Run classic

### Build

First define the configuration using environment variables. Set
`APP_KRAMERIUS_ID` to the library you want the client to run as — the value
must match a directory under `public/local-config/` (here: `mzk`):

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

## Running as your own library

The client ships with configurations for a few libraries under
`public/local-config/`. To run it as **your own** library (`xy` in the steps
below), you do **not** need to modify any source code — just add a config
directory and point the client at it.

1. **Create your config directory** `public/local-config/xy/` with at least:

   ```text
   public/local-config/xy/config-main.json       # required: app.code "xy", api.baseUrl, i18n
   public/local-config/xy/config-licenses.json    # optional
   public/local-config/xy/config-homepage.json    # optional
   ```

   The format of each file is documented in [`docs/config/`](docs/config/).
   `config-main.json` is the only required file; the rest fall back to built-in
   defaults when omitted.

2. **Build the client as `xy`** (this is the same mechanism Docker uses, just
   without a container):

   ```shell
   export APP_DEV_MODE=false
   export APP_KRAMERIUS_ID=xy
   npm run build
   npx serve dist/cdk-client/browser -l 8080
   ```

   The client now starts as the `xy` instance and connects to the backend from
   `public/local-config/xy/config-main.json` → `api.baseUrl`.

> **Note.** The backend the client talks to comes entirely from
> `config-main.json` (`api.baseUrl`) of the selected library. There is no
> hard-coded backend for configured libraries — only an internal fallback that
> applies when `api.baseUrl` is missing. Always set `api.baseUrl` in your
> `config-main.json`.

For running as your own library in the dev server (`npm run start`), see the
note under [Run for development](#run-for-development).

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
      test: ["CMD", "wget", "--quiet", "-O", "/dev/stdout", "http://127.0.0.1/local-config/mzk/config-main.json"]
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
./public/local-config/mzk/config-main.json
```

will override the bundled file and will be served by nginx as:

```text
/local-config/mzk/config-main.json
```

The file can be checked from the host at:

```text
http://localhost:1234/local-config/mzk/config-main.json
```

If you do not need a custom local configuration, you can remove the `volumes` section from `docker-compose.yml`.
