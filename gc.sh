#!/bin/bash

LOGS=${@}

cmd="git commit -m \"$LOGS\""

echo "$cmd"

git add .
git commit -m "$LOGS"
# ssh primary.buzz.guru $cmd | bunyan -o short ${@:3}
# ssh primary.buzz.guru $cmd | ~/projects/lego-starter-kit/bunyan
