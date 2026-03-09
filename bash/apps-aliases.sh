alias o="open"
alias щ="open"
alias o.="open ."
alias щ.="open ."
alias c="code"
alias с="code"
alias c.="code ."
alias сю="code ."
alias cc="cursor"
alias сс="cursor"
alias cc.="cursor ."
alias ссю="cursor ."
alias сгкыщк="cursor"
alias cursor.="cursor"
alias сгкыщкю="cursor ."
alias sublime="/Applications/Sublime\ Text.app/Contents/SharedSupport/bin/subl"
alias subl="/Applications/Sublime\ Text.app/Contents/SharedSupport/bin/subl"
alias subl.="/Applications/Sublime\ Text.app/Contents/SharedSupport/bin/subl ."
alias ыгидю="subl ."
alias ыгид="subl"
alias tf="terraform"

function k() {
  if command -v kubecolor &>/dev/null; then
    kubecolor "$@"
  else
    kubectl "$@"
  fi
}
setup_kubectl_completion() {
  if command -v kubectl >/dev/null 2>&1 && command -v compdef &>/dev/null; then
    compdef k=kubectl
  fi
}
setup_kubectl_completion
if command -v setopt &>/dev/null; then setopt complete_aliases; fi
alias kclear="echo \"k delete deployments --all && k delete services --all && k delete pods --all\" && k delete deployments --all && k delete services --all && k delete pods --all"

alias nmongod="sudo mongod --dbpath /var/lib/mongodb"

alias nginx.start='sudo launchctl load /Library/LaunchDaemons/homebrew.mxcl.nginx.plist'
alias nginx.stop='sudo launchctl unload /Library/LaunchDaemons/homebrew.mxcl.nginx.plist'
alias nginx.restart='nginx.stop && nginx.start'

