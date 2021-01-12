#!/bin/bash

namespace=${1:-dxos}
input="./gen/$namespace.txt"
dir="./projects/$namespace"

mkdir -p $dir

git config --global init.defaultBranch main

function clone() {
  echo ""
  echo "#"
  echo "# $1"
  echo "#"
  echo ""

  # Clone
  git clone git@github.com:$1.git

  parts=(${line//\// })
  repo_dir=${parts[1]}

  pushd $repo_dir

  # Strip git history
  rm -rf .git
  rm -rf .github
  rm -rf .idea
  rm -f yarn.lock

  # Init git
  git init
  git add ".*"
  git add "*"
  git commit -a -m "Initial commit"

  # Strip comments (npx)
  npx @dxos/fu@1.0.8 strip --dir="**/+\(src\|stories\)" --replace --verbose

  # TODO(burdon): Lint fix (for each package).

  popd

  # TODO(burdon): Manually create project and output hash?
}

while IFS= read -r line
do
  if [ ! -z "$line" ]
  then
    pushd $dir
    clone $line
    popd
  fi
done < "$input"
