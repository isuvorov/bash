alias cx="chmod +x"
# alias p="~/bash/bash/utils/p.sh"
alias pd="~/bash/bash/utils/pd.sh"
alias pds="~/bash/bash/utils/pds.sh"
alias pdslogs="~/bash/bash/utils/pdslogs.sh"
alias alert="~/bash/bash/utils/alert.sh"
alias api="~/bash/bash/utils/api.sh"
alias apis="~/bash/bash/utils/apid.sh"
alias ab2="ab -n 1000 -c 100"
alias ab3="ab -n 5000 -c 500"
alias ab4="ab -n 10000 -c 1000"

alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias zen='/Applications/Zen.app/Contents/MacOS/zen'

alias projects="   log ~/bash/bash/nodejs/projects.js && ~/bash/bash/git/gls.js"


function set_dc_alias() {
  if docker compose version >/dev/null 2>&1; then
    alias dc='docker compose'
  else
    alias dc='docker-compose'
  fi
}
set_dc_alias

function set_ds_alias() {
  if docker service ls >/dev/null 2>&1; then
    alias ds='docker service'
  fi
}
set_ds_alias
# alias json-to-csv="bash ./utils/json-to-csv.sh

# json-to-csv() {
#   if [ -z "$1" ]; then
#     echo "❌ Usage: json-to-csv INPUT.json [OUTPUT.csv]" >&2
#     return 1
#   fi

#   input="$1"
#   output="$2"

#   if [ ! -f "$input" ]; then
#     echo "❌ File not found: $input" >&2
#     return 1
#   fi

#   if [ -z "$output" ]; then
#     base="${input##*/}"
#     base="${base%.*}"
#     output="${base}.csv"
#   fi

#   count=$(jq 'length' "$input")
#   if [ "$count" -eq 0 ]; then
#     echo "⚠️ Input file contains an empty array → nothing to convert."
#     > "$output"
#     return 0
#   fi

#   jq -c '
#     .[] 
#     | select(type == "object")
#     | reduce paths(scalars) as $p (
#         {}; 
#         . + { ( $p | map(tostring) | join(".") ): getpath($p) }
#       )
#   ' "$input" \
#   | mlr --ijson --ocsv --allow-schema-change cat > "$output"

#   if [ ! -s "$output" ]; then
#     echo "⚠️ Output CSV is empty — no scalar values found in input objects."
#   else
#     echo "✅ CSV written to: $output"
#   fi
# }