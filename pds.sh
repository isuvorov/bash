#!/usr/bin/env bash
if [[ -f ./.env ]]
then
  set -o allexport
  source .env
  set +o allexport
fi

cmd="$@"
echo "ssh ${SERVER} \"${SERVER_PREFIX}docker service $cmd\""
ssh ${SERVER} "${SERVER_PREFIX}docker service $cmd"
