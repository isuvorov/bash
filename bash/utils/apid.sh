#!/bin/bash

ARGS=${@}

PORT=`node -e "global.__DEV__=true;console.log(require('./.env.js').port || 8080)"`

cmd="http --check-status http://localhost:$PORT$ARGS"
echo "> $cmd" && $cmd

while [ $? -ne 0 ]; do
  echo "======================================================"
  sleep 1
  echo "ERROR, repeat in 2 second"
  sleep 1
  echo "======================================================"
  sleep 1
  echo "> $cmd" && $cmd
  $cmd
done