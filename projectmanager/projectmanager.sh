_PROJECTMANAGER_DIR="$(dirname "${BASH_SOURCE[0]:-${0:a}}")"

alias projects="\
  plog \"$_PROJECTMANAGER_DIR/projects.js && $_PROJECTMANAGER_DIR/gls.js\" && \
  $_PROJECTMANAGER_DIR/projects.js && \
  $_PROJECTMANAGER_DIR/gls.js
"

alias prj="projects"

unset _PROJECTMANAGER_DIR
