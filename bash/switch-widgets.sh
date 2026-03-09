#!/bin/bash

current=$(defaults read com.apple.WindowManager StandardHideWidgets 2>/dev/null)

if [ "$current" = "1" ]; then
  defaults write com.apple.WindowManager StandardHideWidgets -bool false
  echo "Widgets ON"
else
  defaults write com.apple.WindowManager StandardHideWidgets -bool true
  echo "Widgets OFF"
fi

killall NotificationCenter