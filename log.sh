plog() {
  printf "\e[35m>\e[0m \e[2m%s\e[0m\n" "$*"
}
log() {
  plog "$*"
  "$@"
}