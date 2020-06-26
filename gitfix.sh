#!/bin/bash
LOGS=${@-"quickfix"}

cmd="git add. && git commit -m \"fix: $LOGS\" && git push"

echo "$cmd"

git add .
git commit -m "fix: $LOGS"
git push
# ssh primary.buzz.guru $cmd | bunyan -o short ${@:3}
# ssh primary.buzz.guru $cmd | ~/projects/lego-starter-kit/bunyan
