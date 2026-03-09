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
  local INPUT="$1"
  local LIST_FILTER=""
  local PROJECT_FILTER="$2"

  # Parse colon syntax: Project:List (e.g., AI:Today, Work/Website:Today)
  if [[ "$INPUT" == *":"* ]]; then
    PROJECT_FILTER="${INPUT%%:*}"
    LIST_FILTER="${INPUT#*:}"
  else
    LIST_FILTER="$INPUT"
  fi

  # No filter - show all active to-dos (Today)
  if [ -z "$LIST_FILTER" ] && [ -z "$PROJECT_FILTER" ]; then
    osascript <<'EOF'
tell application "Things3"
  set todoItems to to dos of list "Today"
  
  if (count of todoItems) is 0 then
    return "📭 ⭐ Today is empty."
  end if
  
  set outputText to "⭐ Today:" & linefeed & linefeed
  
  repeat with t in todoItems
    set outputText to outputText & "• " & name of t & linefeed
  end repeat
  
  return outputText
end tell
EOF
    return
  fi

  # Double filter: List + Project (e.g., todolist Today AI)
  if [ -n "$PROJECT_FILTER" ]; then
    local AREA_NAME=""
    local PROJECT_NAME="$PROJECT_FILTER"
    
    # Check if project filter contains "/" (Area/Project)
    if [[ "$PROJECT_FILTER" == *"/"* ]]; then
      AREA_NAME="${PROJECT_FILTER%%/*}"
      PROJECT_NAME="${PROJECT_FILTER#*/}"
    fi
    
    osascript <<EOF
tell application "Things3"
  set listTodos to to dos of list "$LIST_FILTER"
  set matchedTodos to {}
  
  repeat with t in listTodos
    try
      set parentProject to project of t
      if parentProject is not missing value then
        set projectName to name of parentProject
        
        -- Check direct project match
        if projectName is "$PROJECT_NAME" then
          set end of matchedTodos to t
        -- Check area/project match
        else if "$AREA_NAME" is not "" then
          try
            set parentArea to area of parentProject
            if parentArea is not missing value then
              if name of parentArea is "$AREA_NAME" and projectName is "$PROJECT_NAME" then
                set end of matchedTodos to t
              end if
            end if
          end try
        end if
      end if
    end try
  end repeat
  
  if (count of matchedTodos) is 0 then
    return "📭 📁 $PROJECT_FILTER / ⭐ $LIST_FILTER is empty."
  end if
  
  set outputText to "📁 $PROJECT_FILTER / ⭐ $LIST_FILTER:" & linefeed & linefeed
  
  repeat with t in matchedTodos
    set outputText to outputText & "• " & name of t & linefeed
  end repeat
  
  return outputText
end tell
EOF
    return
  fi

  # Check if filter contains "/" (Area/Project)
  if [[ "$LIST_FILTER" == *"/"* ]]; then
    local AREA_NAME="${LIST_FILTER%%/*}"
    local PROJECT_NAME="${LIST_FILTER#*/}"
    
    osascript <<EOF
tell application "Things3"
  try
    set targetProject to project "$PROJECT_NAME" of area "$AREA_NAME"
    set todoItems to to dos of targetProject
    
    if (count of todoItems) is 0 then
      return "📭 $AREA_NAME/$PROJECT_NAME is empty."
    end if
    
    set outputText to "📌 $AREA_NAME/$PROJECT_NAME:" & linefeed & linefeed
    
    repeat with t in todoItems
      set outputText to outputText & "• " & name of t & linefeed
    end repeat
    
    return outputText
  on error
    return "❌ Project '$PROJECT_NAME' in area '$AREA_NAME' not found."
  end try
end tell
EOF
    return
  fi

  # Single filter: Try list first, then project, then area
  osascript <<EOF
tell application "Things3"
  -- Try as list first
  try
    set todoItems to to dos of list "$LIST_FILTER"
    
    if (count of todoItems) is 0 then
      return "📭 $LIST_FILTER is empty."
    end if
    
    set outputText to "📌 $LIST_FILTER:" & linefeed & linefeed
    
    repeat with t in todoItems
      set outputText to outputText & "• " & name of t & linefeed
    end repeat
    
    return outputText
  end try
  
  -- Try as project
  try
    set targetProject to project "$LIST_FILTER"
    set todoItems to to dos of targetProject
    
    if (count of todoItems) is 0 then
      return "📭 Project '$LIST_FILTER' is empty."
    end if
    
    set outputText to "📁 Project '$LIST_FILTER':" & linefeed & linefeed
    
    repeat with t in todoItems
      set outputText to outputText & "• " & name of t & linefeed
    end repeat
    
    return outputText
  end try
  
  -- Try as area
  try
    set targetArea to area "$LIST_FILTER"
    set todoItems to to dos of targetArea
    
    if (count of todoItems) is 0 then
      return "📭 Area '$LIST_FILTER' is empty."
    end if
    
    set outputText to "📂 Area '$LIST_FILTER':" & linefeed & linefeed
    
    repeat with t in todoItems
      set outputText to outputText & "• " & name of t & linefeed
    end repeat
    
    return outputText
  end try
  
  return "❌ '$LIST_FILTER' not found as list, project, or area."
end tell
EOF
}

# Show multiple lists/projects at once
# Usage: todoall Today AI "My Project"
todoall() {
  if [ $# -eq 0 ]; then
    echo "Usage: todoall <list|project> [<list|project> ...]"
    echo "Example: todoall Today AI"
    return 1
  fi

  for filter in "$@"; do
    todolist "$filter"
    echo ""
  done
}

# List all projects
todoprojects() {
  osascript <<'EOF'
tell application "Things3"
  set allProjects to projects
  
  if (count of allProjects) is 0 then
    return "No projects found."
  end if
  
  set outputText to "📁 Projects:" & linefeed & linefeed
  
  repeat with p in allProjects
    set projectName to name of p
    set todoCount to count of to dos of p
    set outputText to outputText & "• " & projectName & " (" & todoCount & " tasks)" & linefeed
  end repeat
  
  return outputText
end tell
EOF
}