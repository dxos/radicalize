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

Edit the configuration file:

```yml
# ~/.config/gh/config.yml
aliases:
    repos: |
        !gh api --paginate graphql -f owner="$1" -f query='
          query($owner: String!, $per_page: Int = 100, $endCursor: String) {
            repositoryOwner(login: $owner) {
              repositories(first: $per_page, after: $endCursor, ownerAffiliations: OWNER) {
                nodes { nameWithOwner }
                pageInfo { hasNextPage endCursor }
              }
            }
          }
        ' | jq -r '.data.repositoryOwner.repositories.nodes[].nameWithOwner' | sort
```

Query repos:

```bash
▶ gh repos dxos
```

## Dumping packages

1. Create a repo list at `./gen/dxos.txt`.
1. Run `./scripts/repo-migrate.js`.
1. `./gen/packages` will contain all dumped packages.
