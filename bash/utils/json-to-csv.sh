#!/usr/bin/env bash
json-to-csv() {
  if [ -z "$1" ]; then
    echo "❌ Usage: json-to-csv INPUT.json [OUTPUT.csv]" >&2
    return 1
  fi

  input="$1"
  output="$2"

  if [ ! -f "$input" ]; then
    echo "❌ File not found: $input" >&2
    return 1
  fi

  if [ -z "$output" ]; then
    base="${input##*/}"
    base="${base%.*}"
    output="${base}.csv"
  fi

  jq -c 'map(paths(scalars) as $p | { ( $p | map(tostring) | join(".") ): getpath($p) })[]' "$input" \
    | mlr --ijson --ocsv cat > "$output"

  echo "✅ CSV written to: $output"
}