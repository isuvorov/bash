log() { echo "$*" ; "$@" ; }
alias p="          log pnpm"
alias nx="         log pnpm dlx"
alias px="         log pnpm dlx"
alias n="          log pnpm start"
# alias nc="         log npm run commit"
alias nd="         log pnpm run dev"
alias ndd="        log PORT=3001 config__server__port=8081 pnpm run dev"
alias rs="         log pnpm run dev"
alias nb="         log pnpm run build"
alias nbb="        log pnpm run build --prod"
alias nbt="        echo \"pnpm run build --prod && pnpm run test --prod\" && pnpm run build --prod && pnpm run test --prod" 
# alias nbt="        log ~/bash/bash/nodejs/nbt.js " 
alias nds="        log pnpm run dev:server"
alias ndc="        log pnpm run dev:cra"
alias nt="         log pnpm run test"
alias ntw='
  if grep -q "\"start:watch\":" package.json; then
    log pnpm run start:watch
  elif grep -q "\"test:watch\":" package.json; then
    log pnpm run test:watch
  else
    log pnpm run test --watch
  fi
'
alias ntd='
  if grep -q "\"test:demo\":" package.json; then
    log pnpm run test:demo
  elif grep -q "\"test:dev\":" package.json; then
    log pnpm run test:dev
  else
    log pnpm run test --dev
  fi
'
alias ntl='
  if grep -q "\"test:lint\":" package.json; then
    log pnpm run test:lint
  elif grep -q "\"test:eslint\":" package.json; then
    log pnpm run test:eslint
  else
    log pnpm run test --lint
  fi
'
alias ntlf='
  if grep -q "\"test:lint:fix\":" package.json; then
    log pnpm run test:lint:fix
  elif grep -q "\"test:eslint:fix\":" package.json; then
    log pnpm run test:eslint:fix
  else
    log pnpm run test --lint --fix
  fi
'
alias ntf='
  if grep -q "\"test:lint:fix\":" package.json; then
    log pnpm run test:lint:fix
  elif grep -q "\"test:eslint:fix\":" package.json; then
    log pnpm run test:eslint:fix
  else
    log pnpm run test --lint --fix
  fi
'
alias ntb="        log pnpm run test:benchmark"
alias ntbw="       log pnpm run test:benchmark:watch"
alias pi="         log pnpm i"
alias pl="         log pnpm link -g"
alias pl.="        log pnpm link -g"
alias ni="         log pnpm i"
alias nu="         log pnpm update -i --latest"
alias nur="        log pnpm update -i --latest -r"
alias ncu="        log npm-check -uE"
alias projects="   log ~/bash/bash/nodejs/projects.js && ~/bash/bash/git/gls.js"
#alias nu="        log yarn upgrade-interactive --latest"
# alias ns="         log pnpm run storybook"
# alias ns='if grep -q "\"start:dev\":" package.json; then log pnpm run start:dev; else log pnpm run storybook; fi'
alias ns='
  if grep -q "\"start:dev\":" package.json; then
    log pnpm run start:dev
  elif grep -q "\"start:ts\":" package.json; then
    log pnpm run start:ts
  else
    log pnpm run storybook
  fi
'
alias np="         log pnpm run release"
alias npp="        log pnpm run release --yes"
alias nw="         log pnpm run watch"
alias nr="         log rm -f package-lock.json && pnpm i"
alias nrf="        log rm -f package-lock.json && rm -rf node_modules && pnpm i"
#alias nr="        log rm -rf yarn.lock && rm -rf node_modules && yarn"
alias nl="         log find . -maxdepth 5 -type l | egrep 'node_modules/[^\.]' | grep -v /\.bin"
alias nl.="        log find node_modules -maxdepth 3 -type l | egrep '^node_modules/[^\.]'"
alias nv="         log cat package.json | grep version"
# alias nremove="    log find . -maxdepth 4 -type d -name 'node_modules'"
# alias nremoveyes=" log find . -maxdepth 4 -type d -name 'node_modules' | xargs rm -R"
# alias gstatus="    log find . -maxdepth 1 -type d | xargs "
# alias nl="       log find . -maxdepth 5 -type l | egrep 'node_modules/[^\.]' | grep -v /\.bin | xargs ls -l | xargs cut -d' \./' -f 2"
#alias nl="        log find node_modules -maxdepth 2 -type l | cut -d'/' -f 2"