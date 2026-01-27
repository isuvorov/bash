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
alias sublime="/Applications/Sublime\ Text.app/Contents/SharedSupport/bin/subl"
alias subl="/Applications/Sublime\ Text.app/Contents/SharedSupport/bin/subl"
alias subl.="/Applications/Sublime\ Text.app/Contents/SharedSupport/bin/subl ."
alias sourcetree='open -a SourceTree'
alias st='open -a SourceTree'
alias ые='open -a SourceTree'
alias st.="~/bash/bash/apps/st.sh"
alias ыею="~/bash/bash/apps/st.sh"
alias tf="terraform"

alias passgen="echo \"pwgen -s -y 30 1\" && pwgen -s -y 30 1"
alias passgensafe="echo \"pwgen -s 30 1\" && pwgen -s 30 1"

alias k="kubecolor"
if command -v kubectl >/dev/null 2>&1; then
  compdef k=kubectl
else
  alias k="kubecolor"
fi
setopt complete_aliases
alias kclear="echo \"k delete deployments --all && k delete services --all && k delete pods --all\" && k delete deployments --all && k delete services --all && k delete pods --all"

alias nmongod="sudo mongod --dbpath /var/lib/mongodb"

alias nginx.start='sudo launchctl load /Library/LaunchDaemons/homebrew.mxcl.nginx.plist'
alias nginx.stop='sudo launchctl unload /Library/LaunchDaemons/homebrew.mxcl.nginx.plist'
alias nginx.restart='nginx.stop && nginx.start'

