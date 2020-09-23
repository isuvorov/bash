#!/usr/bin/env bash
if [[ -f ./.env ]]
then
  set -o allexport
  source .env
  set +o allexport
fi

cmd="$@"
echo "ssh ${SERVER} \"docker service $cmd\""
ssh ${SERVER} "docker service $cmd"
