#!/bin/bash

## SSH UTF-8
export LANG=en_US.UTF-8

## NPM AD-BLOCK 
export OPEN_SOURCE_CONTRIBUTOR=true
export DISABLE_OPENCOLLECTIVE=true
export OPENCOLLECTIVE_HIDE=true

## Claude Code

# complete -d cd

# export DEBUG_FORMAT=pretty

# autoload -U compinit
if command -v compinit &>/dev/null; then compinit; fi

_____DIR="$(dirname "${BASH_SOURCE[0]:-$0}")"
# echo "Sourcing bash aliases from $DIR"

. "$_____DIR/mise/mise.sh"
. "$_____DIR/log.sh"


## Aliases set up
. "$_____DIR/bash/apps-aliases.sh"
. "$_____DIR/bash/git-aliases.sh"
. "$_____DIR/bash/utils-aliases.sh"
. "$_____DIR/bash/ru-aliases.sh"

. "$_____DIR/claude/claude.sh"
. "$_____DIR/n/n.sh"
. "$_____DIR/obsidian/obsidian.sh"
. "$_____DIR/things3/things3.sh"
. "$_____DIR/projectmanager/projectmanager.sh"
. "$_____DIR/transcribe/transcribe.sh"
. "$_____DIR/crons/crons.sh"
. "$_____DIR/frp/frp.sh"
[ -f "$_____DIR/local-aliases.sh" ] && . "$_____DIR/local-aliases.sh"

