#!/bin/bash

namespace=${1:-dxos}
input="./gen/$namespace.txt"
root="./projects/$namespace"

mkdir -p $root

git config --global init.defaultBranch main

function migrate() {
  echo ""
  echo "#"
  echo "# $1"
  echo "#"
  echo ""

  # Clone repo.
  git clone git@github.com:$1.git

  parts=(${line//\// })
  repo_dir=${parts[1]}
  pushd $repo_dir

  # Clean-up.
  rm -rf .git
  rm -rf .github
  rm -rf .idea
  rm -f yarn.lock

  # Init git.
  git init
  git add ".*"
  git add "*"
  git commit -a -m "Migration to Radical."

  # Clean-up comments
  npx @dxos/fu@1.0.11 strip --dir='**/+\(src\|stories\)' --replace --verbose

  # TODO(burdon): Lint fix (for each package).

  popd

  # TODO(burdon): Manually create project and output hash?
}

# Read input file.
while IFS= read -r line
do
  if [ ! -z "$line" ]
  then
    pushd $root
    migrate $line
    popd
  fi
done < "$input"
