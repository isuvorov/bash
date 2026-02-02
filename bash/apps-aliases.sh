alias o="open"
alias щ="open"
alias o.="open ."
alias щ.="open ."
alias c="code"
alias с="code"
alias c.="code ."
alias сю="code ."
alias сс="cursor"
alias cc.="cursor ."
alias ссю="cursor ."
alias cursor.="cursor"
alias sublime="/Applications/Sublime\ Text.app/Contents/SharedSupport/bin/subl"
alias subl="/Applications/Sublime\ Text.app/Contents/SharedSupport/bin/subl"
alias subl.="/Applications/Sublime\ Text.app/Contents/SharedSupport/bin/subl ."
alias tf="terraform"

alias k="kubecolor"
setup_kubectl_completion() {
  if command -v kubectl >/dev/null 2>&1; then
    compdef k=kubectl
  fi
}
setup_kubectl_completion
setopt complete_aliases
alias kclear="echo \"k delete deployments --all && k delete services --all && k delete pods --all\" && k delete deployments --all && k delete services --all && k delete pods --all"

alias nmongod="sudo mongod --dbpath /var/lib/mongodb"

alias nginx.start='sudo launchctl load /Library/LaunchDaemons/homebrew.mxcl.nginx.plist'
alias nginx.stop='sudo launchctl unload /Library/LaunchDaemons/homebrew.mxcl.nginx.plist'
alias nginx.restart='nginx.stop && nginx.start'

