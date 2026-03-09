#!/bin/bash

# Добавляем homebrew в PATH для cron
source "$(dirname "$0")/../bash.sh"

echo "Running hourly cron job..."

LOG_FILE="$HOME/bash/crons/hourly/hourly2.log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] ========== HOURLY CRON START ==========" >> "$LOG_FILE"

echo "[$TIMESTAMP] Running: projects.js" >> "$LOG_FILE"
$HOME/bash/projectmanager/projects.js

# echo "[$(date "+%Y-%m-%d %H:%M:%S")] Running: isuvorov-brfly" >> "$LOG_FILE"
# /opt/homebrew/bin/node /Users/isuvorov/projects/isuvorov-brfly/lib/index.js /Users/isuvorov/Movies/obs

# echo "[$(date "+%Y-%m-%d %H:%M:%S")] ========== HOURLY CRON FINISH ==========" >> "$LOG_FILE"

