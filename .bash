#!/bin/bash

# echo "I  ❤️  U"

# echo $PATH
alias p="~/bash/p.sh"
alias pd="~/bash/pd.sh"
alias pds="~/bash/pds.sh"
alias pdslogs="~/bash/pdslogs.sh"
alias alert="~/bash/alert.sh"
alias gitfix="~/bash/gitfix.sh"
alias gf="~/bash/gitfix.sh"

alias ga="git add ."
alias gp="git push origin develop:master"
alias gc="~/bash/gc.sh"
alias gls="~/bash/gls.sh"
alias api="~/bash/api.sh"
alias apis="~/bash/apid.sh"

# alias gitlab="~/bash/gitlab.sh"
alias gitlab="node ~/bash/gitlab.js"
alias gclone="node ~/bash/gclone.js"

alias ab2="ab -n 1000 -c 100"
alias ab3="ab -n 5000 -c 500"
alias ab4="ab -n 10000 -c 1000"

alias nc="npm run commit"
alias nd="INSTANCE=1 STAGE=$USER npm run dev"
alias ndd="PORT=3001 config__server__port=8081 INSTANCE=1 STAGE=$USER npm run dev"
alias nds="INSTANCE=1 STAGE=$USER npm run server"
alias nt="npm test --watch"
alias nu="npm-check -uE"
alias projects="node ~/bash/projects.js ~/projects && cd ~/projects && ~/bash/gls.sh && cd -"
#alias nu="yarn upgrade-interactive --latest"
alias ns="npm run storybook"
alias np="npm run release"
alias npp="npm run release:yes"
alias nw="npm run watch"
alias nr="rm -f package-lock.json && npm install"
alias nrf="rm -f package-lock.json && rm -rf node_modules && npm install"
#alias nr="rm -rf yarn.lock && rm -rf node_modules && yarn"
alias ni=" npm i --no-save"
alias nl.="find node_modules -maxdepth 3 -type l | egrep '^node_modules/[^\.]'"
alias nl="find . -maxdepth 5 -type l | egrep 'node_modules/[^\.]' | grep -v /\.bin"
alias nv="cat package.json | grep version"
alias nremove="find . -maxdepth 4 -type d -name 'node_modules'"
alias nremoveyes="find . -maxdepth 4 -type d -name 'node_modules' | xargs rm -R"
alias gstatus="find . -maxdepth 1 -type d | xargs "
# alias nl="find . -maxdepth 5 -type l | egrep 'node_modules/[^\.]' | grep -v /\.bin | xargs ls -l | xargs cut -d' \./' -f 2"

#alias nl="find node_modules -maxdepth 2 -type l | cut -d'/' -f 2"

alias o="open"
alias o.="open ."
alias a="atom"
alias a.="atom ."
alias c="code"
alias c.="code ."

alias nmongod="sudo mongod --dbpath /var/lib/mongodb"
alias dc="docker-compose"
alias s="/Applications/Sublime\ Text.app/Contents/SharedSupport/bin/subl"
alias subl="/Applications/Sublime\ Text.app/Contents/SharedSupport/bin/subl"
alias sublime="/Applications/Sublime\ Text.app/Contents/SharedSupport/bin/subl"

alias nginx.start='sudo launchctl load /Library/LaunchDaemons/homebrew.mxcl.nginx.plist'
alias nginx.stop='sudo launchctl unload /Library/LaunchDaemons/homebrew.mxcl.nginx.plist'
alias nginx.restart='nginx.stop && nginx.start'
alias sourcetree='open -a SourceTree'
alias st='open -a SourceTree'
alias st.="open -a SourceTree ."

PROMPT_TITLE='echo -ne "\033]0;${USER}@${HOSTNAME%%.*}:${PWD/#$HOME/~}\007"'
export PROMPT_COMMAND="${PROMPT_TITLE}; ${PROMPT_COMMAND}"


## NPM AD-BLOCK 
export OPEN_SOURCE_CONTRIBUTOR=true
export DISABLE_OPENCOLLECTIVE=true
export OPENCOLLECTIVE_HIDE=true