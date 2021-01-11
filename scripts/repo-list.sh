#!/bin/bash

namespace=${1:-dxos}
output="./gen/$namespace.txt"

mkdir -p "./gen"

gh repos $namespace > $output
