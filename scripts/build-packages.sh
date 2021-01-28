#!/bin/bash
set -euo pipefail

succ="$(pwd)/gen/building-packages.txt"
fail="$(pwd)/gen/failing-packages.txt"
incon="$(pwd)/gen/inconclusive-packages.txt" # no package.json or other reason

echo "" > $succ
echo "" > $fail

pushd gen/packages > /dev/null

for package in ./*
do
  if test -f "$package/package.json"; then
    echo -e "\nBuilding $package"
    pushd $package > /dev/null
    (yarn --silent && yarn build) && echo $package >> $succ || echo $package >> $fail
    popd > /dev/null
  else
    echo $package >> $incon
  fi
done

popd > /dev/null
