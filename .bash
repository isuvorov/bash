#!/bin/bash

# TEST="/${#$HOME/~}"

# TEST=${HOME//\/Volumes\/backupssd\/project/X} 
HOME2='/Volumes/backupssd/projects'
# firstString="/Volumes/backupssd/projects/asfdgfdgf"
# firstString2="/Volumes/backupssd/projects"
# secondString="~/projects"
# HOME=${HOME/$firstString2/$secondString}
# echo $HOME

# echo $TEST
## CLI set up
# PROMPT_TITLE='echo -ne "\033]0;${USER}@${HOSTNAME%%.*}:${PWD/#$HOME/asdasd}\007"'
# export PROMPT_COMMAND="${PROMPT_TITLE}; ${PROMPT_COMMAND}"

## Aliases set up
. ~/bash/bash/apps-aliases.sh
. ~/bash/bash/git-aliases.sh
. ~/bash/bash/nodejs-aliases.sh
. ~/bash/bash/utils-aliases.sh

## NPM AD-BLOCK 
export OPEN_SOURCE_CONTRIBUTOR=true
export DISABLE_OPENCOLLECTIVE=true
export OPENCOLLECTIVE_HIDE=true

export LOG_LEVEL=trace
# complete -d cd

# autoload -U compinit
compinit