#!/bin/bash

LOGS=${@}

cmd="git commit -m \"$LOGS\""

echo "$cmd"

git commit -m "$LOGS"
