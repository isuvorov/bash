
alias nc="npm run commit"
alias nd="INSTANCE=1 npm run dev"
alias nb="INSTANCE=1 npm run build"
alias ndd="PORT=3001 config__server__port=8081 INSTANCE=1 npm run dev"
alias nds="INSTANCE=1 npm run dev:server"
alias ndc="npm run dev:cra"
alias ndt="npm run test -- --watch"
alias ntw="npm run test -- --watch"
alias nt="npm test"
alias nu="npm-check -uE"
alias projects="~/bash/bash/nodejs/projects.js ~/projects && cd ~/projects && ~/bash/bash/git/gls.sh && cd -"
#alias nu="yarn upgrade-interactive --latest"
alias ns="npm run storybook"
alias np="npm run release"
alias npp="npm run release:yes"
alias nw="npm run watch"
alias nr="rm -f package-lock.json && npm install"
alias nri="rm -rf node_modules && npm install"
alias nrf="rm -f package-lock.json && rm -rf node_modules && npm install"
#alias nr="rm -rf yarn.lock && rm -rf node_modules && yarn"
alias nl.="find node_modules -maxdepth 3 -type l | egrep '^node_modules/[^\.]'"
alias nl="find . -maxdepth 5 -type l | egrep 'node_modules/[^\.]' | grep -v /\.bin"
alias nv="cat package.json | grep version"
alias nremove="find . -maxdepth 4 -type d -name 'node_modules'"
alias nremoveyes="find . -maxdepth 4 -type d -name 'node_modules' | xargs rm -R"
alias gstatus="find . -maxdepth 1 -type d | xargs "
# alias nl="find . -maxdepth 5 -type l | egrep 'node_modules/[^\.]' | grep -v /\.bin | xargs ls -l | xargs cut -d' \./' -f 2"

#alias nl="find node_modules -maxdepth 2 -type l | cut -d'/' -f 2"