
alias cx="chmod +x"
# alias p="~/bash/bash/utils/p.sh"
alias pd="~/bash/bash/utils/pd.sh"
alias pds="~/bash/bash/utils/pds.sh"
alias pdslogs="~/bash/bash/utils/pdslogs.sh"
alias alert="~/bash/bash/utils/alert.sh"
alias api="~/bash/bash/utils/api.sh"
alias apis="~/bash/bash/utils/apid.sh"
alias ab2="ab -n 1000 -c 100"
alias ab3="ab -n 5000 -c 500"
alias ab4="ab -n 10000 -c 1000"

alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias zen='/Applications/Zen.app/Contents/MacOS/zen'

function set_dc_alias() {
  if docker compose version >/dev/null 2>&1; then
    alias dc='docker compose'
  else
    alias dc='docker-compose'
  fi
}
set_dc_alias

function set_ds_alias() {
  if docker service ls >/dev/null 2>&1; then
    alias ds='docker service'
  fi
}
set_ds_alias