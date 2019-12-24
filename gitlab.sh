URL="https://`git config --get remote.origin.url | cut -d'/' -f 3 | cut -d'@' -f 2 | cut -d':' -f 1`/`git config --get remote.origin.url | cut -d'/' -f 4`/`git config --get remote.origin.url | cut -d'/' -f 5 | cut -d'.' -f 1`/commit/`git rev-parse HEAD`"
echo open $URL
open $URL