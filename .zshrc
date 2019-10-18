# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:/usr/local/bin:$PATH

# Path to your oh-my-zsh installation.
export ZSH=/Users/isuvorov/.oh-my-zsh

# Set name of the theme to load. Optionally, if you set this to "random"
# it'll load a random theme each time that oh-my-zsh is loaded.
# See https://github.com/robbyrussell/oh-my-zsh/wiki/Themes

BULLETTRAIN_PROMPT_CHAR=">"
BULLETTRAIN_TIME_SHOW=false
#BULLETTRAIN_CUSTOM_MSG="��"
#BULLETTRAIN_CONTEXT_SHOW=true
#BULLETTRAIN_NVM_SHOW=true
BULLETTRAIN_EXEC_TIME_SHOW=true
ZSH_THEME="bullet-train"

# Configuracion POWERLVEL9K
# POWERLEVEL9K_MODE='awesome-patched'

POWERLEVEL9K_SHORTEN_DIR_LENGTH=6
POWERLEVEL9K_SHORTEN_STRATEGY="truncate_middle"

# Elementos de la barra
POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(context dir)
# POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(status rbenv virtualenv vi_mode)
# POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(status vcs history)
POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(vcs background_jobs root_indicator status)
POWERLEVEL9K_STATUS_VERBOSE=false

POWERLEVEL9K_PROMPT_ON_NEWLINE=true
POWERLEVEL9K_MULTILINE_FIRST_PROMPT_PREFIX="\n"
# POWERLEVEL9K_MULTILINE_SECOND_PROMPT_PREFIX="→ "
# POWERLEVEL9K_MULTILINE_SECOND_PROMPT_PREFIX="→ "
# POWERLEVEL9K_MULTILINE_SECOND_PROMPT_PREFIX="😀 "
POWERLEVEL9K_MULTILINE_SECOND_PROMPT_PREFIX="❯ "

# POWERLEVEL9K_DIR_HOME_BACKGROUND='09'
# POWERLEVEL9K_DIR_DEFAULT_BACKGROUND='09'
# POWERLEVEL9K_DIR_HOME_SUBFOLDER_BACKGROUND='009'
# POWERLEVEL9K_DIR_HOME_FOREGROUND='236'
# POWERLEVEL9K_DIR_DEFAULT_FOREGROUND='236'
# POWERLEVEL9K_DIR_HOME_SUBFOLDER_FOREGROUND='236'

# `git hub colors`
# POWERLEVEL9K_VCS_CLEAN_BACKGROUND='236'
# POWERLEVEL9K_VCS_CLEAN_BACKGROUND='119'
# POWERLEVEL9K_VCS_CLEAN_FOREGROUND='236'
# POWERLEVEL9K_VCS_UNTRACKED_BACKGROUND='214'
# POWERLEVEL9K_VCS_UNTRACKED_FOREGROUND='236'
# POWERLEVEL9K_VCS_MODIFIED_BACKGROUND='196'
# POWERLEVEL9K_VCS_MODIFIED_FOREGROUND='236'

# Quitar iconos del inicio
# POWERLEVEL9K_HOME_ICON=''
# POWERLEVEL9K_HOME_SUB_ICON=''
# POWERLEVEL9K_FOLDER_ICON=''

# Vi-Mode
# POWERLEVEL9K_VI_MODE_INSERT_BACKGROUND='005'
# POWERLEVEL9K_VI_MODE_INSERT_FOREGROUND='236'
# POWERLEVEL9K_VI_MODE_NORMAL_BACKGROUND='245'
# POWERLEVEL9K_VI_MODE_NORMAL_FOREGROUND='236'
ZSH_THEME="powerlevel9k/powerlevel9k"



# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion. Case
# sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment the following line to disable bi-weekly auto-update checks.
# DISABLE_AUTO_UPDATE="true"

# Uncomment the following line to change how often to auto-update (in days).
# export UPDATE_ZSH_DAYS=13

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# The optional three formats: "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load? (plugins can be found in ~/.oh-my-zsh/plugins/*)
# Custom plugins may be added to ~/.oh-my-zsh/custom/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
# plugins=(git command-not-found common-aliases dirhistory bundler osx brew httpie history per-directory-history)
plugins=(git common-aliases iterm2 dirhistory bundler osx brew httpie history per-directory-history qwewqe zsh-autosuggestions)
source $ZSH/oh-my-zsh.sh

# User configuration

# export MANPATH="/usr/local/man:$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='mvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch x86_64"

# ssh
# export SSH_KEY_PATH="~/.ssh/dsa_id"

# Set personal aliases, overriding those provided by oh-my-zsh libs,
# plugins, and themes. Aliases can be placed here, though oh-my-zsh
# users are encouraged to define aliases within the ZSH_CUSTOM folder.
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"

source ~/.bash

#test -e "${HOME}/.iterm2_shell_integration.zsh" && source "${HOME}/.iterm2_shell_integration.zsh"
###-begin-npm-completion-###
#
# npm command completion script
#
# Installation: npm completion >> ~/.bashrc  (or ~/.zshrc)
# Or, maybe: npm completion > /usr/local/etc/bash_completion.d/npm
#

if type complete &>/dev/null; then
  _npm_completion () {
    local words cword
    if type _get_comp_words_by_ref &>/dev/null; then
      _get_comp_words_by_ref -n = -n @ -w words -i cword
    else
      cword="$COMP_CWORD"
      words=("${COMP_WORDS[@]}")
    fi

    local si="$IFS"
    IFS=$'\n' COMPREPLY=($(COMP_CWORD="$cword" \
                           COMP_LINE="$COMP_LINE" \
                           COMP_POINT="$COMP_POINT" \
                           npm completion -- "${words[@]}" \
                           2>/dev/null)) || return $?
    IFS="$si"
  }
  complete -o default -F _npm_completion npm
elif type compdef &>/dev/null; then
  _npm_completion() {
    local si=$IFS
    compadd -- $(COMP_CWORD=$((CURRENT-1)) \
                 COMP_LINE=$BUFFER \
                 COMP_POINT=0 \
                 npm completion -- "${words[@]}" \
                 2>/dev/null)
    IFS=$si
  }
  compdef _npm_completion npm
elif type compctl &>/dev/null; then
  _npm_completion () {
    local cword line point words si
    read -Ac words
    read -cn cword
    let cword-=1
    read -l line
    read -ln point
    si="$IFS"
    IFS=$'\n' reply=($(COMP_CWORD="$cword" \
                       COMP_LINE="$line" \
                       COMP_POINT="$point" \
                       npm completion -- "${words[@]}" \
                       2>/dev/null)) || return $?
    IFS="$si"
  }
  compctl -K _npm_completion npm
fi
###-end-npm-completion-###



DEFAULT_USER=""
prompt_context () { }

ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=5'
# ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=23'
# ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=180'
source ~/.oh-my-zsh/custom/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh
