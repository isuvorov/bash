# Usage:
# sendtodo купить хлеб

# sendtodo -s "Срочно" оплатить налоги

# sendtodo -s "План" <<EOF
# 1. Сделать бэкап
# 2. Запустить деплой
# 3. Проверить логи
# EOF

# ls -la | sendtodo -s "Список файлов"

sendtodo() {
  local SUBJECT="TODO"
  local BODY=""

  # --- parse arguments ---
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -s|--subject)
        SUBJECT="$2"
        shift 2
        ;;
      *)
        BODY+="$1 "
        shift
        ;;
    esac
  done

  # --- stdin support ---
  if [ -z "$BODY" ] && [ ! -t 0 ]; then
    BODY="$(cat)"
  fi

  # --- trim ---
  BODY="$(echo "$BODY" | sed 's/[[:space:]]*$//')"

  # --- fallback ---
  if [ -z "$BODY" ]; then
    echo "Usage:"
    echo "  sendtodo [-s subject] message"
    echo "  echo \"text\" | sendtodo [-s subject]"
    return 1
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