#!/usr/bin/env bash
# install_tools.sh — Install gitleaks and trufflehog for secret scanning
# Usage: bash scripts/install_tools.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; }

# ---- gitleaks ----
if command -v gitleaks &>/dev/null; then
    log "gitleaks already installed: $(gitleaks version)"
else
    log "Installing gitleaks..."
    if command -v go &>/dev/null; then
        go install github.com/zricethezav/gitleaks/v8@latest 2>/dev/null && \
            log "gitleaks installed via go" || {
            warn "go install failed, trying direct download..."
            install_gitleaks_binary
        }
    else
        install_gitleaks_binary
    fi
fi

install_gitleaks_binary() {
    local arch="x64"
    local os="windows"
    local ext="zip"
    local url="https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_${os}_${arch}.${ext}"
    local tmpdir
    tmpdir=$(mktemp -d)
    log "Downloading gitleaks from $url"
    curl -sL "$url" -o "$tmpdir/gitleaks.zip" && \
        unzip -o "$tmpdir/gitleaks.zip" -d "$tmpdir/gitleaks" && \
        cp "$tmpdir/gitleaks/gitleaks.exe" /usr/local/bin/ 2>/dev/null || \
        warn "Could not install gitleaks binary. Install manually: https://github.com/gitleaks/gitleaks/releases"
    rm -rf "$tmpdir"
}

# ---- trufflehog ----
if command -v trufflehog &>/dev/null; then
    log "trufflehog already installed: $(trufflehog --version 2>/dev/null || echo 'ok')"
else
    log "Installing trufflehog..."
    if command -v pip &>/dev/null; then
        pip install trufflehog3 2>/dev/null && log "trufflehog3 installed via pip"
    # alias for consistency
    if ! command -v trufflehog &>/dev/null && command -v trufflehog3 &>/dev/null; then
        log "Note: use 'trufflehog3' command (trufflehog3 is the Python fork)"
    fi || {
            warn "pip install failed, trying direct download..."
            install_trufflehog_binary
        }
    else
        install_trufflehog_binary
    fi
fi

install_trufflehog_binary() {
    local arch="amd64"
    local os="windows"
    local url
    url=$(curl -sL https://api.github.com/repos/trufflesecurity/trufflehog/releases/latest | \
        grep -oP "\"browser_download_url\": \"[^\"]+trufflehog_${os}_${arch}[^\"]+\"" | \
        head -1 | grep -oP 'https://[^"]+')
    if [ -n "$url" ]; then
        local tmpdir
        tmpdir=$(mktemp -d)
        log "Downloading trufflehog from $url"
        curl -sL "$url" -o "$tmpdir/trufflehog.zip" && \
            unzip -o "$tmpdir/trufflehog.zip" -d "$tmpdir/trufflehog" && \
            cp "$tmpdir/trufflehog/trufflehog.exe" /usr/local/bin/ 2>/dev/null || \
            warn "Could not install trufflehog binary. Install manually: https://github.com/trufflesecurity/trufflehog/releases"
        rm -rf "$tmpdir"
    else
        warn "Could not determine trufflehog download URL"
    fi
}

# ---- Verify ----
echo ""
log "=== Verification ==="
ok=true
command -v gitleaks &>/dev/null && log "gitleaks: $(gitleaks version)" || { err "gitleaks: NOT FOUND"; ok=false; }
command -v trufflehog &>/dev/null && log "trufflehog: $(trufflehog --version 2>/dev/null || echo 'available')" || { warn "trufflehog: NOT FOUND (optional)"; }

if $ok; then
    log "All tools ready!"
else
    err "Some tools missing. See warnings above."
fi
