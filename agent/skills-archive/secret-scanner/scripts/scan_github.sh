#!/usr/bin/env bash
# scan_github.sh — Audit all GitHub repos for leaked secrets
# Usage: bash scripts/scan_github.sh [owner] [--deep]
#   owner:  GitHub username/org (defaults to authenticated user)
#   --deep: Also clone and scan repos with disabled secret scanning

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

OWNER="${1:-$(gh api user --jq '.login' 2>/dev/null)}"
DEEP=false
[[ "${2:-}" == "--deep" ]] && DEEP=true

log()  { echo -e "${GREEN}[+]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; }
info() { echo -e "${CYAN}[*]${NC} $*"; }

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# ---- Collect repos ----
log "Fetching repos for $OWNER..."
REPOS=$(gh repo list "$OWNER" --limit 200 --json name,isPrivate --jq '.[] | "\(.name)|\(.isPrivate)"')

TOTAL=0
ENABLED=0
DISABLED=0
ALERTS=0
FINDINGS=""

# ---- Scan each repo ----
while IFS='|' read -r name is_private; do
    TOTAL=$((TOTAL + 1))
    visibility="private"
    [[ "$is_private" == "false" ]] && visibility="public"

    # Check secret scanning status
    status=$(gh api "repos/${OWNER}/${name}" --jq '.security_and_analysis.secret_scanning.status' 2>/dev/null || echo "unknown")

    if [[ "$status" == "enabled" ]]; then
        ENABLED=$((ENABLED + 1))
        # Fetch alerts
        count=$(gh api "repos/${OWNER}/${name}/secret-scanning/alerts" --jq 'length' 2>/dev/null || echo "error")
        if [[ "$count" =~ ^[0-9]+$ ]] && [[ "$count" -gt 0 ]]; then
            ALERTS=$((ALERTS + count))
            err "🚨 ${name} (${visibility}): ${count} SECRET(S) FOUND"
            # Get details
            gh api "repos/${OWNER}/${name}/secret-scanning/alerts" --jq '.[] | "  Type: \(.secret_type) | State: \(.state) | URL: \(.html_url)"' 2>/dev/null | while read -r line; do
                echo -e "  ${RED}${line}${NC}"
            done
        else
            info "✓ ${name} (${visibility}): ${count} alerts"
        fi
    else
        DISABLED=$((DISABLED + 1))
        warn "⊘ ${name} (${visibility}): secret scanning DISABLED"
        if $DEEP; then
            log "  Deep-scanning ${name}..."
            if command -v gitleaks &>/dev/null; then
                gh repo clone "${OWNER}/${name}" "$TMPDIR/$name" -- --depth=50 2>/dev/null && {
                    results=$(gitleaks detect --source "$TMPDIR/$name" --no-banner 2>/dev/null | tail -n +2)
                    if [ -n "$results" ]; then
                        err "  🚨 gitleaks found secrets in ${name}:"
                        echo "$results" | head -20 | while read -r line; do
                            echo -e "    ${RED}${line}${NC}"
                        done
                    else
                        info "  ✓ gitleaks: clean"
                    fi
                }
                rm -rf "$TMPDIR/$name"
            else
                warn "  gitleaks not installed, skipping deep scan"
            fi
        fi
    fi
done <<< "$REPOS"

# ---- Summary ----
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  GitHub Secret Audit Summary — ${OWNER}${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "  Total repos scanned:  ${TOTAL}"
echo -e "  Scanning enabled:     ${GREEN}${ENABLED}${NC}"
echo -e "  Scanning disabled:    ${YELLOW}${DISABLED}${NC}"
echo -e "  Secret alerts found:  ${RED}${ALERTS}${NC}"
echo ""

if [[ $ALERTS -gt 0 ]]; then
    err "ACTION REQUIRED: Rotate exposed credentials immediately!"
    err "1. Go to each alert URL above"
    err "2. Rotate the compromised secret"
    err "3. Review who may have accessed it"
    exit 1
elif [[ $DISABLED -gt 0 ]]; then
    warn "RECOMMENDATION: Enable secret scanning on ${DISABLED} repos"
    warn "  gh api -X PUT repos/${OWNER}/<repo>/security-and-analysis -f secret_scanning_status=enabled"
    exit 0
else
    log "All clear — no secrets detected!"
    exit 0
fi
