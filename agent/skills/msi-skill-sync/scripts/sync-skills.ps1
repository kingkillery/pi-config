# MSI Skill Sync — Generic Version
# Syncs skill directories from a canonical source into a target workspace.
#
# USAGE:
#   .\sync-skills.ps1 -Canonical <source> -Target <dest> [-DryRun] [-Force] [-Manifest <path>]
#
# EXAMPLES:
#   # Dry-run
#   .\sync-skills.ps1 -Canonical "C:\Users\prest\.agents\skills1\pk-skills1" -Target "C:\vault\Skills\skills1" -DryRun
#
#   # Sync with prompt
#   .\sync-skills.ps1 -Canonical "C:\Users\prest\.agents\skills1\pk-skills1" -Target "C:\vault\Skills\skills1"
#
#   # Force sync, log to manifest
#   .\sync-skills.ps1 -Canonical "C:\Users\prest\.agents\skills1\pk-skills1" -Target "C:\vault\Skills\skills1" -Force -Manifest "C:\vault\_ORG\_MANIFEST.md"

param(
    [Parameter(Mandatory=$true)][string]$Canonical,
    [Parameter(Mandatory=$true)][string]$Target,
    [switch]$DryRun,
    [switch]$Force,
    [string]$Manifest
)

$ErrorActionPreference = "Stop"

# ── preflight ──
if (-not (Test-Path $Canonical)) {
    Write-Host "CANONICAL SOURCE NOT FOUND: $Canonical" -ForegroundColor Red
    Write-Host "Is the source directory available?" -ForegroundColor Yellow
    exit 1
}
if (-not (Test-Path $Target)) {
    Write-Host "TARGET NOT FOUND: $Target" -ForegroundColor Red
    Write-Host "Create the target directory first or check the path." -ForegroundColor Yellow
    exit 1
}

# ── scan ──
Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  MSI SKILL SYNC" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$canonicalDirs = Get-ChildItem $Canonical -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name | Sort-Object
$vaultDirs = Get-ChildItem $Target -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name | Sort-Object

$canonicalSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$vaultSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($d in $canonicalDirs) { $canonicalSet.Add($d) | Out-Null }
foreach ($d in $vaultDirs) { $vaultSet.Add($d) | Out-Null }

# ── diff ──
$newInCanonical = [System.Collections.Generic.List[string]]::new()
$inBoth = [System.Collections.Generic.List[string]]::new()
$vaultOnly = [System.Collections.Generic.List[string]]::new()

foreach ($d in $canonicalDirs) {
    if ($vaultSet.Contains($d)) { $inBoth.Add($d) } else { $newInCanonical.Add($d) }
}
foreach ($d in $vaultDirs) {
    if (-not $canonicalSet.Contains($d)) { $vaultOnly.Add($d) }
}

# ── check for updated files in overlapping skills ──
$updatedSkills = [System.Collections.Generic.List[string]]::new()

foreach ($skill in $inBoth) {
    $cFiles = Get-ChildItem "$Canonical\$skill" -Recurse -File -ErrorAction SilentlyContinue
    $vFiles = Get-ChildItem "$Target\$skill" -Recurse -File -ErrorAction SilentlyContinue

    $cCount = ($cFiles | Measure-Object).Count
    $vCount = ($vFiles | Measure-Object).Count
    $cSize = ($cFiles | Measure-Object -Property Length -Sum).Sum
    $vSize = ($vFiles | Measure-Object -Property Length -Sum).Sum

    if ($cCount -ne $vCount -or $cSize -ne $vSize) {
        $updatedSkills.Add($skill)
    }
}

# ── report ──
Write-Host "Canonical: " -NoNewline; Write-Host $Canonical -ForegroundColor Gray
Write-Host "Target:    " -NoNewline; Write-Host $Target -ForegroundColor Gray
Write-Host ""
Write-Host "Canonical: $($canonicalDirs.Count) skills" -ForegroundColor White
Write-Host "Target:    $($vaultDirs.Count) skills" -ForegroundColor White
Write-Host ""

if ($newInCanonical.Count -gt 0) {
    Write-Host "-- NEW in canonical (not yet in target): $($newInCanonical.Count) --" -ForegroundColor Green
    foreach ($d in $newInCanonical) { Write-Host "  + $d" -ForegroundColor Green }
    Write-Host ""
}

if ($updatedSkills.Count -gt 0) {
    Write-Host "-- UPDATED in canonical (file count/size differs): $($updatedSkills.Count) --" -ForegroundColor Yellow
    foreach ($d in $updatedSkills) { Write-Host "  ~ $d" -ForegroundColor Yellow }
    Write-Host ""
}

if ($vaultOnly.Count -gt 0) {
    Write-Host "-- TARGET-ONLY (not in canonical -- will be preserved): $($vaultOnly.Count) --" -ForegroundColor Magenta
    foreach ($d in $vaultOnly) { Write-Host "  * $d" -ForegroundColor Magenta }
    Write-Host ""
}

$unchanged = $inBoth.Count - $updatedSkills.Count
Write-Host "-- UNCHANGED: $unchanged --" -ForegroundColor Gray
Write-Host ""

$totalChanges = $newInCanonical.Count + $updatedSkills.Count

if ($totalChanges -eq 0) {
    Write-Host "Target is already up to date. Nothing to sync." -ForegroundColor Green
    Write-Host ""
    exit 0
}

if ($DryRun) {
    Write-Host "DRY RUN -- no files copied. Run without -DryRun to sync." -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# ── sync ──
if (-not $Force) {
    Write-Host "Sync $totalChanges skill(s) from canonical -> target? (Y/n): " -NoNewline -ForegroundColor Cyan
    $response = Read-Host
    if ($response -ne "" -and $response -ne "Y" -and $response -ne "y") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "Syncing..." -ForegroundColor Cyan

$sw = [System.Diagnostics.Stopwatch]::StartNew()
Copy-Item -Path "$Canonical\*" -Destination $Target -Recurse -Force -ErrorAction SilentlyContinue
$sw.Stop()

# ── post-sync report ──
$newDirs = (Get-ChildItem $Target -Directory -ErrorAction SilentlyContinue).Count
$newFiles = (Get-ChildItem $Target -Recurse -File -ErrorAction SilentlyContinue).Count

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  SYNC COMPLETE" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  $newDirs skill dirs, $newFiles total files" -ForegroundColor White
Write-Host "  Elapsed: $($sw.Elapsed.ToString('mm\:ss'))" -ForegroundColor Gray
Write-Host ""

# ── update manifest if provided ──
if ($Manifest -ne "") {
    if (Test-Path $Manifest) {
        $dateStamp = Get-Date -Format "yyyy-MM-dd HH:mm zzz"
        $entry = "- SYNCED skills from canonical on $dateStamp — $newDirs dirs, $newFiles files ($totalChanges changes applied)"
        Add-Content -Path $Manifest -Value "`n## $dateStamp`n$entry" -Encoding UTF8
        Write-Host "  Manifest updated: $Manifest" -ForegroundColor Gray
    } else {
        Write-Host "  Manifest not found at $Manifest -- skipping log entry" -ForegroundColor Yellow
    }
}
