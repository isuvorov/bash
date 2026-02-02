###########
# Before using these aliases, make sure you have 'ni' installed:
# brew install ni
# https://github.com/antfu-collective/ni
###########


alias pi="         log ni"

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
npp() {
  if grep -q "\"release:prod\":" package.json; then
    log nr release:prod
  else
    log nr release
  fi
}

alias n="          log nr start"
ns() {
  if grep -q "\"start:dev\":" package.json; then
    log nr start:dev
  elif grep -q "\"start:ts\":" package.json; then
    log nr start:ts
  elif grep -q "storybook" package.json; then
    log nr storybook
  else
    log nr start:dev
  fi
}

alias nd="         log nr dev"
alias nds="        log nr dev:server"
alias ndc="        log nr dev:client"
# alias nbt="        echo \"nr build --prod && nr test --prod\" && nr build --prod && nr test --prod" 

alias nb="         log nr build"
nbb() {
  if grep -q "\"build:prod\":" package.json; then
    log nr build:prod
  else
    log nr build
  fi
}
alias nt="         log nr test"
ntt() {
  if grep -q "\"test:prod\":" package.json; then
    log nr test:prod
  else
    log nr test
  fi
}
ntw() {
  if grep -q "\"start:watch\":" package.json; then
    log nr start:watch
  elif grep -q "\"test:watch\":" package.json; then
    log nr test:watch
  else
    log nr test --watch
  fi
}
ntd() {
  if grep -q "\"test:demo\":" package.json; then
    log nr test:demo
  elif grep -q "\"test:dev\":" package.json; then
    log nr test:dev
  else
    log nr test --dev
  fi
}
ntl() {
  if grep -q "\"test:lint\":" package.json; then
    log nr test:lint
  elif grep -q "\"test:eslint\":" package.json; then
    log nr test:eslint
  else
    log nr test --lint
  fi
}

nbt() {
  nbb && ntt
}





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
