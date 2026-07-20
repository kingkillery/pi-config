#===============================================================================
# pi-profile PowerShell integration
#
# Add to your PowerShell profile (~/.config/powershell/Microsoft.PowerShell_profile.ps1)
# or run: Invoke-Expression (Get-Content "$HOME\.pi\bin\pi-profile-completion.ps1" -Raw)
#===============================================================================

function Get-PiProfile {
    $profileFile = "$env:USERPROFILE\.pi\current-profile"
    if (Test-Path $profileFile) {
        Get-Content $profileFile -Raw
    } else {
        "default"
    }
}

function Get-PiProfileDir {
    param([string]$Name)
    if (-not $Name) { $Name = Get-PiProfile }
    if ($Name -eq "default") {
        "$env:USERPROFILE\.pi\agent"
    } else {
        "$env:USERPROFILE\.pi\profiles\$Name"
    }
}

function prompt {
    $currentProfile = Get-PiProfile
    if ($currentProfile -ne "default") {
        "[$currentProfile] "
    }
}

Set-Alias -Name pp -Value pi-profile
function ppl { pi-profile list @args }
function ppc { pi-profile create @args }
function ppu { pi-profile use @args }
function pps { pi-profile show @args }

function pw { $env:PI_PROFILE = "work"; pi $args }
function ppe { $env:PI_PROFILE = "personal"; pi $args }

function pcd {
    param([string]$Name)
    $dir = Get-PiProfileDir $Name
    if (Test-Path $dir) {
        Set-Location $dir
        Write-Host "Changed to profile: $(Get-PiProfile)"
    } else {
        Write-Host "Profile not found: $Name" -ForegroundColor Red
    }
}

function psessions {
    param([string]$Name)
    $dir = Get-PiProfileDir $Name
    $sessionsDir = Join-Path $dir "sessions"
    if (Test-Path $sessionsDir) {
        Get-ChildItem "$sessionsDir\*.jsonl" | Sort-Object LastWriteTime -Descending | Select-Object -First 20
    } else {
        Write-Host "No sessions directory"
    }
}

$piProfileArguments = [Environment]::GetCommandLineArgs()
$piProfileIsInteractive =
    ($piProfileArguments -contains '-NoExit') -or
    (
        -not [Console]::IsInputRedirected -and
        -not ($piProfileArguments | Where-Object { $_ -match '^(?i:-(?:Command|C|EncodedCommand|Enc|File|F|NonInteractive))$' })
    )

if ($piProfileIsInteractive) {
    Write-Host "pi-profile loaded. Use 'pp' for 'pi-profile', 'ppl' for list, etc." -ForegroundColor Green
    Write-Host "Quick access: 'pw' for work profile, 'ppe' for personal profile" -ForegroundColor Green
}
