# radicalize

Utils to migrate Github repos to Radicle.

## Example

```bash
▶ ./radicalize/scripts/repo-list.sh dxos
▶ ./radicalize/scripts/repo-migrate.sh dxos
▶ ./radicalize/scripts/repo-migrate.js
```

## Setup

### Install NPM dependencies

```bash
yarn install
```

### Github CLI

```bash
▶ brew install gh
```

Add required alias:

```bash
gh alias set repos "$(cat ./gh-alias-repos.txt)"
```

Query repos:

```bash
▶ gh repos dxos
```

## Dumping packages

1. Create a repo list at `./gen/dxos.txt`.
1. Run `./scripts/repo-migrate.js`.
1. `./gen/packages` will contain all dumped packages.

## Importing repo into radical

1. Have radical desktop client running
1. `RAD_PASSPHRASE=<your passphrase> ./scripts/rad-import.js ./gen/packages/echo-demo`
