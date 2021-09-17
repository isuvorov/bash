
# ln -s ~/bash/oh-my-zsh/themes/powerlevel10k $ZSH_CUSTOM/themes/powerlevel10k 2>/dev/null
# ln -s ~/bash/oh-my-zsh/plugins/zsh-autosuggestions $ZSH_CUSTOM/plugins/zsh-autosuggestions 2>/dev/null

POWERLEVEL9K_SHORTEN_DIR_LENGTH=3
# POWERLEVEL9K_SHORTEN_STRATEGY="truncate_middle"
POWERLEVEL9K_SHORTEN_STRATEGY="truncate_to_last"


POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(context dir)
POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(vcs background_jobs root_indicator status)
POWERLEVEL9K_STATUS_VERBOSE=false

POWERLEVEL9K_PROMPT_ON_NEWLINE=true
POWERLEVEL9K_MULTILINE_FIRST_PROMPT_PREFIX=""

POWERLEVEL9K_MULTILINE_SECOND_PROMPT_PREFIX="❯ "

POWERLEVEL9K_DIR_HOME_BACKGROUND='14'
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
plugins=(git common-aliases iterm2 dirhistory bundler osx brew httpie history per-directory-history zsh-autosuggestions)

CASE_SENSITIVE="true"

DISABLE_AUTO_UPDATE="true"

# plugins=(git command-not-found common-aliases dirhistory bundler osx brew httpie history per-directory-history)
# plugins=(git common-aliases iterm2 dirhistory bundler osx brew httpie history per-directory-history)
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


DEFAULT_USER=""
prompt_context () { }

ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=5'
# ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=23'
# ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=180'
# source ~/.oh-my-zsh/custom/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh
