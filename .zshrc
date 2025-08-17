source ~/bash/p10k.zsh
# source ~/bash/pure.zsh

# DISABLE_AUTO_UPDATE="true"

source $ZSH/oh-my-zsh.sh
source ~/.bash

bindkey "^[b" backward-word
bindkey "^[f" forward-word


DEFAULT_USER=""
prompt_context () { }

#####################################################################################################################################################################
#####################################################################################################################################################################

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


