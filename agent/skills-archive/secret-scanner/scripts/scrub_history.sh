#!/usr/bin/env bash
# scrub_history.sh — Remove a secret pattern from git history using git-filter-repo
# Usage: bash scripts/scrub_history.sh <repo-path> <secret-pattern> [--force]
# WARNING: Rewrites git history. Coordinate with all collaborators before running.

set -euo pipefail

REPO_PATH="${1:?Usage: scrub_history.sh <repo-path> <secret-pattern> [--force]}"
SECRET="${2:?Usage: scrub_history.sh <repo-path> <secret-pattern> [--force]}"
FORCE=false
[[ "${3:-}" == "--force" ]] && FORCE=true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; }

# ---- Safety check ----
if ! $FORCE; then
    warn "This will REWRITE git history for: $REPO_PATH"
    warn "Secret pattern to remove: $SECRET"
    echo ""
    read -p "Are you sure? This cannot be undone. Type YES to continue: " confirm
    [[ "$confirm" == "YES" ]] || { err "Aborted."; exit 1; }
fi

cd "$REPO_PATH"

# ---- Check for git-filter-repo ----
if ! command -v git-filter-repo &>/dev/null; then
    log "Installing git-filter-repo..."
    pip install git-filter-repo 2>/dev/null || {
        err "Could not install git-filter-repo. Run: pip install git-filter-repo"
        exit 1
    }
fi

# ---- Create backup ----
BACKUP="${REPO_PATH}_backup_$(date +%Y%m%d_%H%M%S)"
log "Creating backup at $BACKUP"
cp -r "$REPO_PATH" "$BACKUP"

# ---- Scrub the secret ----
log "Removing secret pattern from git history..."
log "Pattern: $SECRET"

# Create a replacements expression file
EXPRS=$(mktemp)
echo "${SECRET}==>REDACTED_SECRET" > "$EXPRS"

git filter-repo --replace-text "$EXPRS" --force

rm -f "$EXPRS"

# ---- Verify ----
log "Verifying secret is removed..."
remaining=$(git log --all -p -- . | grep -c "$SECRET" || true)

if [[ $remaining -eq 0 ]]; then
    log "✓ Secret successfully removed from all history"
    log "Backup preserved at: $BACKUP"
    echo ""
    warn "IMPORTANT: You must now force-push to update the remote:"
    warn "  cd $REPO_PATH && git push --force --all"
    warn "All collaborators must re-clone the repository."
else
    err "Secret still found in ${remaining} location(s). Manual review needed."
    err "Search with: git log --all -p -- . | grep '$SECRET'"
fi
