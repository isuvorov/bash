#!/bin/bash

set -e

# ===== DEFAULT PARAMETERS =====
FRP_SERVER_PORT_DEFAULT=7000
FRP_PROTOCOL_DEFAULT="https"

# ===== ARGUMENT PARSING =====
VERBOSE=false
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -v|--verbose) VERBOSE=true ;;
    --server) FRP_SERVER_ADDR="$2"; shift ;;
    --server-port) FRP_SERVER_PORT="$2"; shift ;;
    --token) FRP_TOKEN="$2"; shift ;;
    --domain) FRP_DOMAIN="$2"; shift ;;
    --subdomain) FRP_SUBDOMAIN="$2"; shift ;;
    --port) LOCAL_PORT="$2"; shift ;;
    --protocol) FRP_PROTOCOL="$2"; shift ;;
    *)
      echo "Unknown parameter: $1"
      exit 1
      ;;
  esac
  shift
done

# ===== DEFAULT VALUES =====
FRP_SERVER_PORT="${FRP_SERVER_PORT:-$FRP_SERVER_PORT_DEFAULT}"
FRP_PROTOCOL="${FRP_PROTOCOL:-$FRP_PROTOCOL_DEFAULT}"
LOCAL_PORT="${LOCAL_PORT:-3000}"

# ===== VALIDATION =====
if [[ -z "$FRP_SERVER_ADDR" ]]; then
  echo "Error: --server is required"
  exit 1
fi

if [[ -z "$FRP_TOKEN" ]]; then
  echo "Error: --token is required"
  exit 1
fi

if [[ -z "$FRP_DOMAIN" && -z "$FRP_SUBDOMAIN" ]]; then
  echo "Error: specify --domain or --subdomain"
  exit 1
fi

if [[ -n "$FRP_DOMAIN" && -n "$FRP_SUBDOMAIN" ]]; then
  echo "Error: cannot use both --domain and --subdomain"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRPC_PATH="$(command -v frpc)"

if [[ -z "$FRPC_PATH" || ! -x "$FRPC_PATH" ]]; then
  RED='\033[0;31m'
  BOLD='\033[1m'
  NC='\033[0m'
  echo -e "${RED}${BOLD}Error:${NC} frpc not found in PATH. Please install frpc to /usr/local/bin or ~/bin."
  exit 1
fi

# ===== CONFIG GENERATION =====
if [[ -n "$FRP_DOMAIN" ]]; then
  DOMAIN_CONFIG="customDomains = [\"$FRP_DOMAIN\"]"
  PUBLIC_URL="$FRP_PROTOCOL://$FRP_DOMAIN"
else
  DOMAIN_CONFIG="subdomain = \"$FRP_SUBDOMAIN\""
  PUBLIC_URL="$FRP_PROTOCOL://$FRP_SUBDOMAIN"
fi

echo "Public URL: $PUBLIC_URL"

if [[ "$VERBOSE" == true ]]; then
  echo ""
  echo "===== Configuration ====="
  echo "Server:     $FRP_SERVER_ADDR:$FRP_SERVER_PORT"
  echo "Local port: $LOCAL_PORT"
  echo "Protocol:   $FRP_PROTOCOL"
  [[ -n "$FRP_DOMAIN" ]] && echo "Domain:     $FRP_DOMAIN"
  [[ -n "$FRP_SUBDOMAIN" ]] && echo "Subdomain:  $FRP_SUBDOMAIN"
  echo "frpc path:  $FRPC_PATH"
  echo "========================="
  echo ""
fi

CONFIG_FILE=$HOME/bash/frp/frpc_temp.toml
# ===== START FRPC =====
trap "rm -f $CONFIG_FILE" EXIT

cat > "$CONFIG_FILE" <<EOF
serverAddr = "$FRP_SERVER_ADDR"
serverPort = $FRP_SERVER_PORT

auth.method = "token"
auth.token = "$FRP_TOKEN"

[[proxies]]
name = "dynamic-$(date +%s)"
type = "http"
localPort = $LOCAL_PORT
$DOMAIN_CONFIG
EOF

if [[ "$VERBOSE" == true ]]; then
  echo "Config file: $CONFIG_FILE"
  echo ""
  cat "$CONFIG_FILE"
  echo ""
fi

"$FRPC_PATH" -c "$CONFIG_FILE"
