ZSH_THEME=""
fpath+=($HOME/bash/pure)

autoload -U promptinit; promptinit
prompt pure

plugins=(git common-aliases iterm2 dirhistory bundler macos brew httpie history per-directory-history zsh-autosuggestions)

CASE_SENSITIVE="true"

DISABLE_AUTO_UPDATE="true"
