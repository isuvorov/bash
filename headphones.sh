#!/bin/bash

# This is a placeholder for the actual inactivity detection logic
# You would need additional logic here to determine when to trigger the disconnect

# The name of your Bluetooth device as it appears in the Bluetooth menu
DEVICE_NAME="WH-1000XM3"

# AppleScript to disconnect the Bluetooth device
osascript -e "tell application \"System Events\" to tell process \"SystemUIServer\"
    set btMenu to (menu bar item 1 of menu bar 1 where description is \"bluetooth\")
    click btMenu
    click menu item \"$DEVICE_NAME\" of menu 1 of btMenu
    click menu item \"Disconnect\" of menu 1 of menu item \"$DEVICE_NAME\" of menu 1 of btMenu
end tell"