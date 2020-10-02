#!/bin/bash

ARGS=${@}

PORT=`node -e "console.log(require('./.env.js').port || 8080)"`

cmd="http http://localhost:$PORT$ARGS"

echo "$cmd"

$cmd
