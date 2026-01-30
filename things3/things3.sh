# Usage:
# todoadd купить хлеб

# todoadd -s "Срочно" оплатить налоги

# todoadd -s "План" <<EOF
# 1. Сделать бэкап
# 2. Запустить деплой
# 3. Проверить логи
# EOF

# ls -la | sendtodo -s "Список файлов"

todoadd() {
  local SUBJECT=""
  local BODY=""
  local HAS_SUBJECT=0
  local ARGS=""

  # --- parse arguments ---
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -s|--subject)
        SUBJECT="$2"
        HAS_SUBJECT=1
        shift 2
        ;;
      *)
        ARGS+="$1 "
        shift
        ;;
    esac
  done

  # --- trim args ---
  ARGS="$(echo "$ARGS" | sed 's/[[:space:]]*$//')"

  # --- assign args to subject or body ---
  if [ "$HAS_SUBJECT" -eq 1 ]; then
    BODY="$ARGS"
  else
    SUBJECT="$ARGS"
  fi

  # --- stdin support ---
  if [ -z "$BODY" ] && [ ! -t 0 ]; then
    BODY="$(cat)"
  fi

  # --- trim ---
  BODY="$(echo "$BODY" | sed 's/[[:space:]]*$//')"

  # --- fallback ---
  if [ -z "$SUBJECT" ] && [ -z "$BODY" ]; then
    echo "Usage:"
    echo "  todoadd message"
    echo "  todoadd -s subject message"
    echo "  echo \"text\" | todoadd [-s subject]"
    return 1
  fi

  # --- default subject if only body from stdin ---
  if [ -z "$SUBJECT" ]; then
    SUBJECT="TODO"
  fi

  # --- send via Mail.app ---
  osascript <<EOF
tell application "Mail"
    set msg to make new outgoing message with properties {subject:"$SUBJECT", content:"$BODY\n\n"}
    tell msg
        make new to recipient at end of to recipients with properties {address:"$SENDTODO_EMAIL"}
        send
    end tell
end tell
EOF
}

todolist() {
  local LIST_NAME="${1:-Inbox}"

  osascript <<EOF
tell application "Things3"
  set todoItems to to dos of list "$LIST_NAME"

  if (count of todoItems) is 0 then
    return "✅ $LIST_NAME is empty."
  end if

  set outputText to "📌 $LIST_NAME:" & linefeed & linefeed

  repeat with t in todoItems
    set outputText to outputText & "• " & name of t & linefeed
  end repeat

  return outputText
end tell
EOF
}