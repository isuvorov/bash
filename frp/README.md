# FRP — Fast Reverse Proxy Client Wrapper

A bash script for quickly exposing local services to the internet using [frp](https://github.com/fatedier/frp) (Fast Reverse Proxy).

## Prerequisites

1. Download `frpc` binary from [frp releases](https://github.com/fatedier/frp/releases)
2. Place `frpc` in your working directory
3. Have access to an FRP server

## Installation

The alias is automatically set up via `frp-aliases.sh`:

```bash
source ~/bash/frp/frp-aliases.sh
```

This creates the `frp` alias pointing to the script.

## Usage

```bash
frp --server <server_addr> --token <auth_token> --subdomain <name> [options]
```

### Required Parameters

| Parameter     | Description                          |
|---------------|--------------------------------------|
| `--server`    | FRP server address (IP or hostname)  |
| `--token`     | Authentication token for FRP server  |
| `--domain`    | Custom domain (mutually exclusive with `--subdomain`) |
| `--subdomain` | Subdomain name (mutually exclusive with `--domain`)   |

### Optional Parameters

| Parameter      | Default  | Description                        |
|----------------|----------|------------------------------------|
| `--port`       | `7000`   | FRP server port                    |
| `--local-port` | `3000`   | Local port to expose               |
| `--protocol`   | `https`  | Protocol for public URL display    |

## Examples

### Expose local dev server with subdomain

```bash
frp --server frp.example.com --token mytoken123 --subdomain myapp --local-port 3000
```

This exposes `localhost:3000` at `https://myapp.frp.example.com`

### Expose with custom domain

```bash
frp --server frp.example.com --token mytoken123 --domain app.mydomain.com --local-port 8080
```

This exposes `localhost:8080` at `https://app.mydomain.com`

### Using non-default server port

```bash
frp --server frp.example.com --port 7001 --token mytoken123 --subdomain demo
```

## How It Works

1. Parses command-line arguments
2. Validates required parameters
3. Generates FRP configuration dynamically
4. Starts `frpc` client with the generated config via stdin
5. Creates an HTTP proxy with a unique name (timestamp-based)

## Configuration Generated

The script generates a TOML configuration like:

```toml
serverAddr = "frp.example.com"
serverPort = 7000

auth.method = "token"
auth.token = "your-token"

[[proxies]]
name = "dynamic-1234567890"
type = "http"
localPort = 3000
subdomain = "myapp"
```

## Error Messages

| Error | Cause |
|-------|-------|
| `Error: --server is required` | Missing server address |
| `Error: --token is required` | Missing authentication token |
| `Error: specify --domain or --subdomain` | Neither domain nor subdomain provided |
| `Error: cannot use both --domain and --subdomain` | Both options specified |
| `Error: frpc not found in current directory` | `frpc` binary missing |
