#!/bin/bash

LOGS=${2-10}
# echo "ALLLL"
# echo "${2}"
# echo "ALLLL"
# echo "${@:3}"
# echo "$LOGS"

cmd="docker service logs $1 -f --tail $LOGS --raw"

echo "$cmd | bunyan ${@:3}"
ssh ${SERVER} $cmd | ~/bash/bunyan.js -o short ${@:3}
# -l trace
# ssh primary.buzz.guru $cmd | ~/projects/lego-starter-kit/bunyan
