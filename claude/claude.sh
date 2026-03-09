export CLAUDE_CODE_DISABLE_TERMINAL_TITLE=true

CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude 2>/dev/null || echo "$HOME/.local/bin/claude")}"

cl() {
  CLAUDE_CONFIG_DIR="$HOME/.claude" "$CLAUDE_BIN" "$@"
}
cl-yolo() {
  CLAUDE_CONFIG_DIR="$HOME/.claude" "$CLAUDE_BIN" --dangerously-skip-permissions "$@"
}

LOCAL_CLAUDE_SH="$(dirname "${BASH_SOURCE[0]:-${(%):-%x}}")/local-claude.sh"
if [ -f "$LOCAL_CLAUDE_SH" ]; then
  source "$LOCAL_CLAUDE_SH"
fi
