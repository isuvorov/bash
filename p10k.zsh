# for theme debugging
# ln -s ~/bash/oh-my-zsh/themes/powerlevel10k $ZSH_CUSTOM/themes/powerlevel10k 2>/dev/null
# ln -s ~/bash/oh-my-zsh/plugins/zsh-autosuggestions $ZSH_CUSTOM/plugins/zsh-autosuggestions 2>/dev/null


POWERLEVEL9K_SHORTEN_DIR_LENGTH=3
# POWERLEVEL9K_SHORTEN_STRATEGY="truncate_middle"
# POWERLEVEL9K_SHORTEN_STRATEGY="truncate_to_last"

POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(context dir)
POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(status vcs background_jobs root_indicator)
POWERLEVEL9K_STATUS_VERBOSE=false

POWERLEVEL9K_PROMPT_ON_NEWLINE=true
POWERLEVEL9K_MULTILINE_FIRST_PROMPT_PREFIX=""
POWERLEVEL9K_MULTILINE_SECOND_PROMPT_PREFIX="❯ "

# POWERLEVEL9K_PROMPT_ON_NEWLINE=true
# # Newline before and move the cursor one character backwards
# POWERLEVEL9K_MULTILINE_FIRST_PROMPT_PREFIX="\n\e[1D"
# # Arrow and move the cursor one character forward
# POWERLEVEL9K_MULTILINE_SECOND_PROMPT_PREFIX="❯\e[1C"


POWERLEVEL9K_DIR_HOME_BACKGROUND='14' # NOTE: подумать
POWERLEVEL9K_DIR_DEFAULT_BACKGROUND='14'
POWERLEVEL9K_DIR_HOME_SUBFOLDER_BACKGROUND='14'
POWERLEVEL9K_DIR_HOME_FOREGROUND='236'
POWERLEVEL9K_DIR_DEFAULT_FOREGROUND='236'
POWERLEVEL9K_DIR_HOME_SUBFOLDER_FOREGROUND='236'

POWERLEVEL9K_VCS_CLEAN_BACKGROUND='112'
POWERLEVEL9K_VCS_CLEAN_FOREGROUND='236'
POWERLEVEL9K_VCS_UNTRACKED_BACKGROUND='111'
POWERLEVEL9K_VCS_UNTRACKED_FOREGROUND='236'
POWERLEVEL9K_VCS_MODIFIED_BACKGROUND='214'
POWERLEVEL9K_VCS_MODIFIED_FOREGROUND='236'

ZSH_THEME="powerlevel10k/powerlevel10k"
plugins=(git common-aliases iterm2 dirhistory bundler macos brew httpie history per-directory-history zsh-autosuggestions)

CASE_SENSITIVE="true"
DISABLE_AUTO_UPDATE="true"

# plugins=(git command-not-found common-aliases dirhistory bundler osx brew httpie history per-directory-history)
# plugins=(git common-aliases iterm2 dirhistory bundler osx brew httpie history per-directory-history)

# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
# if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
#   source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
# fi

# POWERLEVEL9K_PROMPT_CHAR_CONTENT_EXPANSION='%(!.#.\$)'
# POWERLEVEL9K_PROMPT_CHAR_CONTENT_EXPANSION='123'
# POWERLEVEL9K_LEFT_PROMPT_ELEMENTS='123'

DEFAULT_USER=""
prompt_context () { }

# ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=5'
# ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=23'
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=180'
# ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE="fg=#ff0000"
# source ~/.oh-my-zsh/custom/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh

