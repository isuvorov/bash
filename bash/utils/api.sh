#!/bin/bash

ARGS=${@}

PORT=`node -e "global.__DEV__=true;console.log(require('./.env.js').port || 8080)"`

cmd="http --check-status http://localhost:$PORT$ARGS"
echo "> $cmd" && $cmd
