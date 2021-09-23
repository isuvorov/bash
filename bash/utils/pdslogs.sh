#!/usr/bin/env bash
if [[ -f ./.env ]]
then
  set -o allexport
  source .env
  set +o allexport
fi

LOGS=${2-10}
# echo "ALLLL"
# echo "${2}"
# echo "ALLLL"
# echo "${@:3}"
# echo "$LOGS"

cmd="docker service logs $1 -f --tail $LOGS --raw"

echo "ssh ${SERVER} \"${SERVER_PREFIX}$cmd\" | lsk log -o short ${@:3}"
# ssh ${SERVER} ${SERVER_PREFIX}$cmd | ~/bash/bunyan.js -o short ${@:3}
ssh ${SERVER} ${SERVER_PREFIX}$cmd | lsk log -o short ${@:3}
# -l trace
# ssh primary.buzz.guru $cmd | ~/projects/lego-starter-kit/bunyan
