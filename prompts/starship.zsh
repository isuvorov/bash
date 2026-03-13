plugins=(git common-aliases iterm2 dirhistory bundler macos brew httpie history per-directory-history zsh-autosuggestions)
CASE_SENSITIVE="true"
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=180'

export STARSHIP_CONFIG=~/bash/prompts/starship.toml

# starship init must run AFTER oh-my-zsh, so we defer it
__lsk_starship_deferred=true

# add newline between prompts, but not before the first one
__lsk_newline_before_prompt=false
__lsk_starship_precmd() {
  if [[ "$__lsk_newline_before_prompt" == "true" ]]; then
    echo
  fi
  __lsk_newline_before_prompt=true
}
precmd_functions+=(__lsk_starship_precmd)
