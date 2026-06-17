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

Run the build:

```shell
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Run

To test the application you have just built, run:

```shell
npx serve dist/cdk-client/browser -l 8080
```

Open in browser:

```text
http://localhost:8080
```

Docker HUB: [https://hub.docker.com/r/trinera/cdk-client](https://hub.docker.com/r/trinera/cdk-client)

## Build & Run s Dockerem

### Build image

```shell
docker build -t trinera/cdk-client:3.0.16-beta .
```

### Build & push (multiplatformní) image na Docker Hub

```shell
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t trinera/cdk-client:3.0.16-beta \
  --push .
```

### Spuštění kontejneru pomocí `docker run`

```shell
docker run -p 1234:80 \
  -e APP_KRAMERIUS_ID=mzk \
  trinera/cdk-client:3.0.16-beta
```

Otevřít v prohlížeči:

```text
http://localhost:1234
```

> **Poznámka:** Proměnná `APP_KRAMERIUS_ID` určuje, která knihovna se použije jako výchozí. Hodnota musí odpovídat kódu knihovny (názvu adresáře pod `local-config/`), například `mzk`, `cdk`, `knav` apod.

Volitelně lze přepsat výchozí lokální konfiguraci připojením lokálního adresáře:

```shell
docker run -p 1234:80 \
  -e APP_KRAMERIUS_ID=mzk \
  -v ./public/local-config:/usr/share/nginx/local-config:ro \
  trinera/cdk-client:3.0.16-beta
```

## Spuštění pomocí Docker Compose

Vytvořte soubor `docker-compose.yml`:

```yaml
services:
  cdk-client:
    image: trinera/cdk-client:3.0.16-beta
    ports:
      - "1234:80"
    environment:
      - APP_KRAMERIUS_ID=mzk
    volumes:
      # Volitelné: přepíše výchozí lokální konfiguraci.
      - ./public/local-config:/usr/share/nginx/local-config:ro
    healthcheck:
      test: ["CMD", "wget", "--quiet", "-O", "/dev/stdout", "http://127.0.0.1/local-config/libraries.json"]
      start_period: 30s
      interval: 30s
      timeout: 5s
      retries: 3
```

Spuštění aplikace:

```shell
docker compose up -d
```

Zastavení aplikace:

```shell
docker compose down
```

Otevřít v prohlížeči:

```text
http://localhost:1234
```

### Proměnné prostředí

| Proměnná | Povinná | Popis | Příklad |
|---|---|---|---|
| `APP_KRAMERIUS_ID` | ano | Kód knihovny — určuje výchozí konfiguraci. Musí odpovídat názvu adresáře pod `local-config/`. | `mzk`, `cdk`, `knav` |

### Lokální konfigurace (volume)

Docker image obsahuje výchozí verzi konfiguračních souborů.

Volitelně lze výchozí konfiguraci přepsat připojením lokálního adresáře z hostitelského systému:

```yaml
volumes:
  - ./public/local-config:/usr/share/nginx/local-config:ro
```

Tím se namapují lokální konfigurační soubory z:

```text
./public/local-config
```

na cestu v kontejneru:

```text
/usr/share/nginx/local-config
```

Volume je připojen jako read-only pomocí přípony `:ro`.

Díky tomu image funguje ihned s výchozí konfigurací, ale zároveň umožňuje poskytnout runtime konfiguraci externě.

Například lokální soubor:

```text
./public/local-config/libraries.json
```

přepíše výchozí soubor v image a nginx ho bude servírovat jako:

```text
/local-config/libraries.json
```

Soubor lze ověřit z hostitelského systému na adrese:

```text
http://localhost:1234/local-config/libraries.json
```

Pokud vlastní lokální konfiguraci nepotřebujete, můžete sekci `volumes` z `docker-compose.yml` odstranit.
