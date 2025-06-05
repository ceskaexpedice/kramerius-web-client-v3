# CDK Client

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.0.6. Later upgraded to Angular 19.

## Development

### Run

`npm run start`

for a local dev server. Navigate to `http://localhost:4200/`.
The application will automatically reload if you change any of the source files.

## Build & Run

### Build

First define configuration in environment variables

```shell

export APP_DEV_MODE=false
export APP_KRAMERIUS_URL="https://api.kramerius.mzk.cz/search"

```

Now run `npm run build` to build the project. 

The build artifacts will be stored in the `dist/` directory.

The environment configuration from `APP_*` variables will be stored into `dist/cdk-client/browser/assets/env.json`

### Run

To test the the app you've just built 

`npx serve dist/cdk-client/browser -l 8080` 

And open in browser

`http://localhost:8080`

## Docker Build & Run

### Build
```
docker build -t cdk-client .
```

possibly including version tag  
```
docker build -t trinera/cdk-client:1.0.3 .
```

or including version tag and tag `latest`
```
docker build -t trinera/cdk-client:latest -t trinera/cdk-client:1.0.3 .
```

### Push to Dockerhub

Only if you have write access to Dockerhub repository trinera/cdk-client.
You don't need this to run localy built Docker image.

```
docker push trinera/cdk-client:1.0.3
docker push trinera/cdk-client:latest
```

### Run Docker image

#### Local image

Run locally built Docker image

##### Run
```
docker run -p 1234:80 \
  -e APP_DEV_MODE=false \
  -e APP_KRAMERIUS_URL=https://api.kramerius.mzk.cz/search \
trinera/cdk-client
```

##### Run exact version:
```
docker run -p 1234:80 \
  -e APP_KRAMERIUS_URL=https://api.kramerius.mzk.cz/search \
trinera/cdk-client:latest
```
or

```
docker run -p 1234:80 \
  -e APP_KRAMERIUS_URL=https://api.kramerius.mzk.cz/search \
trinera/cdk-client:1.0.3
```

#### Image pulled from Docker Hub

Run image that someone built and pushed to Dockerhub.

##### Run

```
docker pull trinera/cdk-client:latest
docker run -p 1234:80 \
  -e APP_KRAMERIUS_URL=https://api.kramerius.mzk.cz/search \  
trinera/cdk-client
```

And open in browser

`http://localhost:1234`

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
