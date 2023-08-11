# for theme debugging
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
# POWERLEVEL9K_DIR_DEFAULT_BACKGROUND='6'
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
source $ZSH/oh-my-zsh.sh
source ~/.bash


DEFAULT_USER=""
prompt_context () { }

# ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=5'
# ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=23'
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=180'
# ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE="fg=#ff0000"
# source ~/.oh-my-zsh/custom/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh


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
      _get_comp_words_by_ref -n = -n @ -n : -w words -i cword
    else
      cword="$COMP_CWORD"
      words=("${COMP_WORDS[@]}")
    fi

    local si="$IFS"
    if ! IFS=$'\n' COMPREPLY=($(COMP_CWORD="$cword" \
                           COMP_LINE="$COMP_LINE" \
                           COMP_POINT="$COMP_POINT" \
                           npm completion -- "${words[@]}" \
                           2>/dev/null)); then
      local ret=$?
      IFS="$si"
      return $ret
    fi
    IFS="$si"
    if type __ltrim_colon_completions &>/dev/null; then
      __ltrim_colon_completions "${words[cword]}"
    fi
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
    if ! IFS=$'\n' reply=($(COMP_CWORD="$cword" \
                       COMP_LINE="$line" \
                       COMP_POINT="$point" \
                       npm completion -- "${words[@]}" \
                       2>/dev/null)); then

      local ret=$?
      IFS="$si"
      return $ret
    fi
    IFS="$si"
  }
  compctl -K _npm_completion npm
fi
###-end-npm-completion-###


# pnpm install-completion zsh
# /Users/isuvorov/.config/tabtab/zsh/pnpm.zsh
###-begin-pnpm-completion-###
if type compdef &>/dev/null; then
  _pnpm_completion () {
    local reply
    local si=$IFS

    IFS=$'\n' reply=($(COMP_CWORD="$((CURRENT-1))" COMP_LINE="$BUFFER" COMP_POINT="$CURSOR" pnpm completion -- "${words[@]}"))
    IFS=$si

    if [ "$reply" = "__tabtab_complete_files__" ]; then
      _files
    else
      _describe 'values' reply
    fi
  }
  compdef _pnpm_completion pnpm
  compdef _pnpm_completion p
fi
###-end-pnpm-completion-###

# я выражаю уважение своегому сопернику по верстке
# господин верстальщик, вы наконец довольны?
# вы наконец получили свой, блядский инфоповод?
# свой медиавброс
# пять версток подряд нужно было лажать, чтобы я наконец пришел и отревьювил код

# ну что поздравляю, господин верстальщик и одновременно с этим качок. 
# ты уже совсем заврался, если кто не знает верстальщикив иерархии стоят ниже фронтендеров, а фронтендеры ниже бекендеров, а бекендеры стоят ниже мусоров
# тебя бы с таким кодом не подпустили бы в мужскую радевалку, господин верстальщик


# зачем тебе вообще эта верстка, если ты не можешь ее написать?
# зачем врать о своих навыках, если ты не можешь их показать?
# зачем ты врешь везде ты аноним, тебя никто никогда не видел, я реальный человек, с реальными недостатками кто ты?

