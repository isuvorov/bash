# Auto-select prompt based on LSKJS_BASH_PROMPT variable and available tools
# Usage: set LSKJS_BASH_PROMPT to "starship", "p10k", "pure", or leave empty for auto-detection

__lsk_prompt_init() {
  # Load LSKJS_BASH_PROMPT from ~/.bash if not already set
  if [[ -z "$LSKJS_BASH_PROMPT" && -f ~/.bash ]]; then
    eval "$(grep '^export LSKJS_BASH_PROMPT=' ~/.bash 2>/dev/null)"
  fi

  local prompt_type="${LSKJS_BASH_PROMPT}"

  # Auto-detect if not explicitly set
  if [[ -z "$prompt_type" ]]; then
    if command -v starship &>/dev/null; then
      prompt_type="starship"
    elif [[ -d "${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k" ]]; then
      prompt_type="p10k"
    fi
  fi

  [[ -z "$prompt_type" ]] && return

  case "$prompt_type" in
    starship)
      source ~/bash/prompts/starship.zsh
      ;;
    p10k|powerlevel10k)
      source ~/bash/prompts/p10k.zsh
      ;;
    pure)
      source ~/bash/prompts/pure.zsh
      ;;
    *)
      echo "[auto.zsh] Unknown prompt type: $prompt_type" >&2
      ;;
  esac
}

__lsk_prompt_init
