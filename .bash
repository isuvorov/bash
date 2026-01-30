#!/bin/bash

## SSH UTF-8
export LANG=en_US.UTF-8

## NPM AD-BLOCK 
export OPEN_SOURCE_CONTRIBUTOR=true
export DISABLE_OPENCOLLECTIVE=true
export OPENCOLLECTIVE_HIDE=true
# complete -d cd

# export DEBUG_FORMAT=pretty

# autoload -U compinit
compinit

DIR="$(dirname "${BASH_SOURCE[0]:-$0}")"
# echo "Sourcing bash aliases from $DIR"

## Aliases set up
. "$DIR/bash/apps-aliases.sh"
. "$DIR/bash/git-aliases.sh"
. "$DIR/bash/utils-aliases.sh"
. "$DIR/bash/ru-aliases.sh"

. "$DIR/n/n.sh"
. "$DIR/obsidian/obsidian.sh"
. "$DIR/things3/things3.sh"