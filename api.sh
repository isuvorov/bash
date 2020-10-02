#!/bin/bash

ARGS=${@}

PORT=`node -e "console.log(require('./.env.js').port || 8080)"`

cmd="http --check-status http://localhost:$PORT$ARGS"

echo "$cmd"

$cmd

while [ $? -ne 0 ]; do
  echo "ERROR, repeat in 2 second"
  sleep 1
  echo ""
  sleep 1
  echo "$cmd"
  $cmd
done