log() {
  printf "\e[35m>\e[0m \e[2m%s\e[0m\n" "$*"
  "$@"
}

###########
# Before using these aliases, make sure you have 'ni' installed:
# brew install ni
# https://github.com/antfu-collective/ni
###########


alias nu="         log nup"
alias nrm="        log rm -f {package-lock.json,yarn.lock,bun.lockb} && ni"
alias nrmf="       log rm -f {package-lock.json,yarn.lock,bun.lockb} && rm -rf node_modules && ni"

# alias p="          log pnpm"
# alias px="         log pnpm dlx"
# alias pi="         log pnpm i"
# alias pl="         log pnpm link -g"
# alias pl.="        log pnpm link -g"

alias nf="         log nr fix"
alias np="         log nr release"
alias npp="        log nr release --yes"

alias n="          log nr start"
alias ns='
  if grep -q "\"start:dev\":" package.json; then
    log nr start:dev
  elif grep -q "\"start:ts\":" package.json; then
    log nr start:ts
  else
  elif grep -q "storybook" package.json; then
    log nr storybook
  else
    log nr start:dev
  fi
'

alias nd="         log nr dev"
alias nds="        log nr dev:server"
alias ndc="        log nr dev:client"
# alias nbt="        echo \"nr build --prod && nr test --prod\" && nr build --prod && nr test --prod" 
alias nbt="        log nr build --prod && log nr test --prod"

alias nb="         log nr build"
alias nbb="        log nr build --prod"
alias nt="         log nr test"
alias ntw='
  if grep -q "\"start:watch\":" package.json; then
    log nr start:watch
  elif grep -q "\"test:watch\":" package.json; then
    log nr test:watch
  else
    log nr test --watch
  fi
'
alias ntd='
  if grep -q "\"test:demo\":" package.json; then
    log nr test:demo
  elif grep -q "\"test:dev\":" package.json; then
    log nr test:dev
  else
    log nr test --dev
  fi
'
alias ntl='
  if grep -q "\"test:lint\":" package.json; then
    log nr test:lint
  elif grep -q "\"test:eslint\":" package.json; then
    log nr test:eslint
  else
    log nr test --lint
  fi
'





# alias nu="         log pnpm update -i --latest"
# alias nur="        log pnpm update -i --latest -r"


# alias ntlf='
#   if grep -q "\"test:lint:fix\":" package.json; then
#     log pnpm run test:lint:fix
#   elif grep -q "\"test:eslint:fix\":" package.json; then
#     log pnpm run test:eslint:fix
#   else
#     log pnpm run test --lint --fix
#   fi
# '
# alias ntf='
#   if grep -q "\"test:lint:fix\":" package.json; then
#     log pnpm run test:lint:fix
#   elif grep -q "\"test:eslint:fix\":" package.json; then
#     log pnpm run test:eslint:fix
#   else
#     log pnpm run test --lint --fix
#   fi
# '
# alias ntb="        log pnpm run test:benchmark"
# alias ntbw="       log pnpm run test:benchmark:watch"
#alias nu="        log yarn upgrade-interactive --latest"
# alias ns="         log pnpm run storybook"
# alias ns='if grep -q "\"start:dev\":" package.json; then log pnpm run start:dev; else log pnpm run storybook; fi'
# alias nw="         log pnpm run watch"
