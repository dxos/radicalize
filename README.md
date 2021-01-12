# radicalize

Utils to migrate Github repos to Radicle.

## Example

```bash
▶ ./radicalize/scripts/repo-list.sh dxos
▶ ./radicalize/scripts/repo-migrate.sh dxos
```

## Setup

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
