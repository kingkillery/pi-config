---
name: secret-scanner
description: Scan git repos and GitHub repositories for leaked secrets, API keys, credentials, tokens, and sensitive data. Prevent accidental credential exposure before pushing code. Triggers on "scan for secrets", "check for leaked keys", "find exposed credentials", "secret scan", "credential leak", "check my repo for secrets", "pre-push secret check", "scan github for secrets", "did I leak any secrets", "find API keys in code", "audit secrets", or any request to detect/prevent secret exposure in code repositories.
---

# Secret Scanner

Find leaked secrets, API keys, tokens, and credentials in local git repos and GitHub repositories.

## Modes

### Mode 1: Local Repo Scan
Scan a local directory or git repository using gitleaks + trufflehog.

### Mode 2: GitHub Account Audit
Scan all GitHub repos via API for secret scanning alerts + run gitleaks on clones.

### Mode 3: Pre-Push Check
Scan staged changes before a git push to catch secrets before they leave your machine.

---

## Setup — Install Tools

Run `scripts/install_tools.sh` if gitleaks or trufflehog are missing. The script:

1. Installs **gitleaks** via `go install` (Go must be available)
2. Installs **trufflehog** via `pip install trufflehog` or binary download
3. Verifies both tools are on PATH

---

## Mode 1: Local Repo Scan

```bash
# Quick scan — gitleaks on a repo
gitleaks detect --source <path> -v

# Deep scan — gitleaks + trufflehog
gitleaks detect --source <path> -v --report-format json --report-path /tmp/gitleaks-report.json
trufflehog3 <path> --json 2>/dev/null | jq -r '.type + " | " + .path'
```

**Workflow:**
1. Run `gitleaks detect --source <path> -v` first (fast, catches 100+ secret types)
2. If findings found, also run trufflehog for verification (reduces false positives)
3. Review each finding: is it a real secret or a test/example value?
4. If real: rotate the credential immediately, then scrub from git history
5. Run `scripts/scrub_history.sh <repo-path> <secret-pattern>` to rewrite history

**Common findings to ignore:**
- Files in `node_modules/`, `.git/`, `vendor/`
- Test fixtures with placeholder values like `YOUR_API_KEY_HERE`
- Example config files (`.env.example`)
- Public documentation of key formats

---

## Mode 2: GitHub Account Audit

```bash
# Scan all repos for GitHub secret scanning alerts
scripts/scan_github.sh
```

This script:
1. Lists all repos for the authenticated user
2. Checks GitHub Secret Scanning API on each repo
3. Reports: which repos have alerts, which have scanning disabled
4. For repos with scanning disabled: clones and runs gitleaks locally

**Manual GitHub API queries:**
```bash
# Check a single repo for alerts
gh api repos/<owner>/<repo>/secret-scanning/alerts --jq '.[] | "\(.secret_type) | \(.state) | \(.html_url)"'

# Check if secret scanning is enabled
gh api repos/<owner>/<repo> --jq '.security_and_analysis.secret_scanning.status'

# List repos with scanning disabled (candidates for manual audit)
gh repo list --limit 200 --json name --jq '.[].name' | while read repo; do
  status=$(gh api "repos/<owner>/${repo}" --jq '.security_and_analysis.secret_scanning.status' 2>/dev/null)
  if [ "$status" = "disabled" ]; then echo "DISABLED: $repo"; fi
done
```

---

## Mode 3: Pre-Push Check

Run before every `git push` to catch secrets in staged changes:

```bash
# Scan only staged changes (fast)
gitleaks protect --staged -v

# Scan staged + all uncommitted changes
gitleaks protect -v

# Pre-push hook (add to .git/hooks/pre-push)
#!/bin/sh
gitleaks protect --staged -v || exit 1
```

**Git hook setup:**
```bash
# Install gitleaks as a pre-commit hook in a repo
cd <repo-path>
gitleaks git hook pre-commit
```

---

## Handling Findings

### If a real secret is found:

1. **Rotate immediately** — The secret is compromised regardless of git history
2. **Verify exposure** — Check if the repo is public; if private, assess who has access
3. **Scrub git history** — Use `scripts/scrub_history.sh` or BFG Repo Cleaner
4. **Re-scan** — Confirm the secret is fully removed after scrubbing

### False positive patterns:

```bash
# Generate a .gitleaks.toml to ignore known false positives
cat > .gitleaks.toml << 'EOF'
[allowlist]
paths = [
  '''\.env\.example$''',
  '''test/fixtures/.*''',
  '''\.example$''',
  '''docs/.*\.md$''',
]
regexes = [
  '''YOUR_[A-Z_]+_HERE''',
  '''xxx+xxx''',
  '''sk-test-[a-z]+''',
]
EOF

# Scan with allowlist
gitleaks detect --source <path> -v --config .gitleaks.toml
```

---

## Secret Types Detected

Gitleaks detects 150+ secret types including:
- AWS Access Keys / Secret Keys
- GitHub Personal Access Tokens / OAuth
- Slack Webhooks / Bot Tokens
- Stripe API Keys / Live Keys
- Google API Keys / OAuth Tokens
- Heroku API Keys
- Twilio Account SIDs / Auth Tokens
- SendGrid API Keys
- Private SSH Keys
- Database connection strings (MySQL, PostgreSQL, MongoDB)
- JWT tokens
- Generic high-entropy strings

Trufflehog3 (Python fork) adds:
- Git history scanning (finds secrets in old commits)
- Custom regex patterns
- JSON output for automated processing

---

## References

- Gitleaks config: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml
- GitHub Secret Scanning API: https://docs.github.com/rest/secret-scanning
- Trufflehog docs: https://github.com/trufflesecurity/trufflehog
