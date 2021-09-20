#!/bin/bash
HOME2='/Volumes/backupssd/projects'

## SSH UTM-8
export LANG=en_US.UTF-8

## NPM AD-BLOCK 
export OPEN_SOURCE_CONTRIBUTOR=true
export DISABLE_OPENCOLLECTIVE=true
export OPENCOLLECTIVE_HIDE=true

export LOG_LEVEL=trace
# complete -d cd

# autoload -U compinit
compinit

## Aliases set up
. ~/bash/bash/apps-aliases.sh
. ~/bash/bash/git-aliases.sh
. ~/bash/bash/nodejs-aliases.sh
. ~/bash/bash/utils-aliases.sh