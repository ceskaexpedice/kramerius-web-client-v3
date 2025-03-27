# Getting Started With Schematics

This repository is a basic Schematic implementation that serves as a starting point to create and publish Schematics to NPM.


### Running the Schematic
Example of running the schematic:

```schematics ./ngrx-entity:ngrx-entity --name=periodicals --path=src/app/state --dry-run=false```

This will create a new entity state in the `src/app/state` folder with the name `periodicals`.

### Testing

To test locally, install `@angular-devkit/schematics-cli` globally and use the `schematics` command line tool. That tool acts the same as the `generate` command of the Angular CLI, but also has a debug mode.

Check the documentation with

```bash
schematics --help
```

### Publishing

To publish, simply:

```bash
npm run build
npm publish
```
