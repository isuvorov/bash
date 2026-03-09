#!/bin/bash

source "$(dirname "$0")/../bash.sh"
LOG_FILE="$HOME/bash/crons/nightly/nightly.log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] ========== NIGHTLY CRON START ==========" >> "$LOG_FILE"

echo "[$TIMESTAMP] Running: projects.js" >> "$LOG_FILE"
$HOME/bash/projectmanager/projects.js

echo "[$TIMESTAMP] Running: isuvorov-brfly" >> "$LOG_FILE"
brfly $HOME/Movies/obs

echo "[$TIMESTAMP] ==========  NIGHTLY CRON FINISH ==========" >> "$LOG_FILE"

