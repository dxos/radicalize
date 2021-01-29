#!/bin/bash
set -euo pipefail

succ="$(pwd)/gen/building-packages.txt"
fail="$(pwd)/gen/failing-packages.txt"
incon="$(pwd)/gen/inconclusive-packages.txt" # no package.json or other reason

rm -f $succ $fail $incon
touch $succ $fail $incon

pushd gen/packages > /dev/null

for package in ./*
do
  if test -f "$package/package.json"; then
    echo -e "\nBuilding $package"
    cp -r $package "${package}_TEMP"
    pushd "${package}_TEMP" > /dev/null
    (yarn --silent && yarn build) && echo $package >> $succ || echo $package >> $fail
    popd > /dev/null
    rm -rf "${package}_TEMP"
  else
    echo $package >> $incon
  fi
done

popd > /dev/null
