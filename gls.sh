for D in *; do
    if [ -d "${D}" ]; then
      cd "${D}"
      # echo "${D}";
      if [ -d ".git" ]; then
        VAR=$(git status -s | grep "" -c)
        # echo "${D} - $VAR uncommited files";
        if [ $VAR ]; then
          echo "${D} - $VAR uncommited files";
        fi
      fi
      cd ..
    fi
done