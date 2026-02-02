#!/usr/bin/env bash
if [[ -f ./.env ]]
then
  set -o allexport
  source .env
  set +o allexport
fi

cmd="$@"
echo "ssh ${SERVER} \"${LSKJS_PDS_PREFIX}docker service $cmd\""
ssh ${SERVER} "${LSKJS_PDS_PREFIX}docker service $cmd"
