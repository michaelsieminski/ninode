#!/usr/bin/env bash
# ninode installer — downloads the latest release binary for the current platform.
# Usage: curl -fsSL https://raw.githubusercontent.com/michaelsieminski/ninode/main/install.sh | sh

set -euo pipefail

REPO="michaelsieminski/ninode"
INSTALL_DIR="${NINODE_INSTALL_DIR:-$HOME/.local/bin}"
BIN_NAME="ninode"

err() { echo "error: $*" >&2; exit 1; }
info() { echo "$*"; }

detect_target() {
  local os arch
  case "$(uname -s)" in
    Darwin) os="darwin" ;;
    Linux)  os="linux"  ;;
    *) err "unsupported OS: $(uname -s)" ;;
  esac
  case "$(uname -m)" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64)  arch="x64"   ;;
    *) err "unsupported architecture: $(uname -m)" ;;
  esac
  echo "${os}-${arch}"
}

main() {
  command -v curl >/dev/null 2>&1 || err "curl is required"

  local target version url tmp
  target="$(detect_target)"

  if [ -n "${NINODE_VERSION:-}" ]; then
    version="$NINODE_VERSION"
  else
    info "Looking up latest release..."
    version="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
      | grep -m1 '"tag_name":' \
      | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')"
    [ -n "$version" ] || err "could not determine latest version (set NINODE_VERSION to override)"
  fi

  url="https://github.com/${REPO}/releases/download/${version}/${BIN_NAME}-${target}"
  info "Downloading ${BIN_NAME} ${version} (${target})..."

  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  if ! curl -fsSL --proto '=https' --tlsv1.2 -o "$tmp/$BIN_NAME" "$url"; then
    err "download failed: $url"
  fi

  chmod +x "$tmp/$BIN_NAME"
  mkdir -p "$INSTALL_DIR"
  mv "$tmp/$BIN_NAME" "$INSTALL_DIR/$BIN_NAME"

  info ""
  info "Installed: $INSTALL_DIR/$BIN_NAME"

  case ":$PATH:" in
    *":$INSTALL_DIR:"*) info "Run: ninode" ;;
    *)
      info ""
      info "Add to PATH (then restart your shell):"
      info "  export PATH=\"\$PATH:$INSTALL_DIR\""
      ;;
  esac
}

main "$@"
