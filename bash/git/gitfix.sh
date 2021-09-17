#!/bin/bash
LOGS=${@-"quickfix"}

cmd="git add . && git commit -m \"fix: $LOGS\" && git push"

echo "$cmd"

git add .
git commit -m "fix: $LOGS"
git push
