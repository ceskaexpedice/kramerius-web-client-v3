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

<html><head></head><body><p>Docker HUB: <a href="https://hub.docker.com/r/trinera/cdk-client">https://hub.docker.com/r/trinera/cdk-client</a></p>
<h2>Build &amp; Run s Dockerem</h2>
<h3>Build image</h3>
<pre><code class="language-shell">docker build -t trinera/cdk-client:3.0.12-beta .
</code></pre>
<h3>Build &amp; push (multiplatformní) image na Docker Hub</h3>
<pre><code class="language-shell">docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t trinera/cdk-client:3.0.12 \
  --push .
</code></pre>
<h3>Spuštění kontejneru pomocí <code>docker run</code></h3>
<pre><code class="language-shell">docker run -p 1234:80 \
  -e APP_KRAMERIUS_ID=mzk \
  trinera/cdk-client:3.0.12
</code></pre>
<p>Otevřít v prohlížeči:</p>
<pre><code class="language-text">http://localhost:1234
</code></pre>
<blockquote>
<p><strong>Poznámka:</strong> Proměnná <code>APP_KRAMERIUS_ID</code> určuje, která knihovna se použije jako výchozí. Hodnota musí odpovídat kódu knihovny (názvu adresáře pod <code>local-config/</code>), například <code>mzk</code>, <code>cdk</code>, <code>knav</code> apod.</p>
</blockquote>
<p>Volitelně lze přepsat výchozí lokální konfiguraci připojením lokálního adresáře:</p>
<pre><code class="language-shell">docker run -p 1234:80 \
  -e APP_KRAMERIUS_ID=mzk \
  -v ./public/local-config:/usr/share/nginx/local-config:ro \
  trinera/cdk-client:3.0.12
</code></pre>
<h2>Spuštění pomocí Docker Compose</h2>
<p>Vytvořte soubor <code>docker-compose.yml</code>:</p>
<pre><code class="language-yaml">services:
  cdk-client:
    image: trinera/cdk-client:3.0.12
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
</code></pre>
<p>Spuštění aplikace:</p>
<pre><code class="language-shell">docker compose up -d
</code></pre>
<p>Zastavení aplikace:</p>
<pre><code class="language-shell">docker compose down
</code></pre>
<p>Otevřít v prohlížeči:</p>
<pre><code class="language-text">http://localhost:1234
</code></pre>
<h3>Proměnné prostředí</h3>

Proměnná | Povinná | Popis | Příklad
-- | -- | -- | --
APP_KRAMERIUS_ID | ano | Kód knihovny — určuje výchozí konfiguraci. Musí odpovídat názvu adresáře pod local-config/. | mzk, cdk, knav


<h3>Lokální konfigurace (volume)</h3>
<p>Docker image obsahuje výchozí verzi konfiguračních souborů.</p>
<p>Volitelně lze výchozí konfiguraci přepsat připojením lokálního adresáře z hostitelského systému:</p>
<pre><code class="language-yaml">volumes:
  - ./public/local-config:/usr/share/nginx/local-config:ro
</code></pre>
<p>Tím se namapují lokální konfigurační soubory z:</p>
<pre><code class="language-text">./public/local-config
</code></pre>
<p>na cestu v kontejneru:</p>
<pre><code class="language-text">/usr/share/nginx/local-config
</code></pre>
<p>Volume je připojen jako read-only pomocí přípony <code>:ro</code>.</p>
<p>Díky tomu image funguje ihned s výchozí konfigurací, ale zároveň umožňuje poskytnout runtime konfiguraci externě.</p>
<p>Například lokální soubor:</p>
<pre><code class="language-text">./public/local-config/libraries.json
</code></pre>
<p>přepíše výchozí soubor v image a nginx ho bude servírovat jako:</p>
<pre><code class="language-text">/local-config/libraries.json
</code></pre>
<p>Soubor lze ověřit z hostitelského systému na adrese:</p>
<pre><code class="language-text">http://localhost:1234/local-config/libraries.json
</code></pre>
<p>Pokud vlastní lokální konfiguraci nepotřebujete, můžete sekci <code>volumes</code> z <code>docker-compose.yml</code> odstranit.</p></body></html>
