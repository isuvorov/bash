#!/bin/bash

source "$(dirname "$0")/../bash.sh"
LOG_FILE="$HOME/bash/crons/daily/daily.log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] ========== DAILY CRON START ==========" >> "$LOG_FILE"

echo "[$TIMESTAMP] Running: projects.js" >> "$LOG_FILE"
$HOME/bash/projectmanager/projects.js

# echo "[$TIMESTAMP] Running: isuvorov-brfly" >> "$LOG_FILE"
# brfly /Users/isuvorov/Movies/obs

echo "[$TIMESTAMP] ==========  DAILY CRON FINISH ==========" >> "$LOG_FILE"
