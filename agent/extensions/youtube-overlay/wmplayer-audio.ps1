param(
  [Parameter(Mandatory = $true)]
  [string]$AudioUrl,

  [double]$StartSeconds = 0,

  [int]$Volume = 70,

  [switch]$Muted
)

$ErrorActionPreference = "Stop"

try {
  $player = New-Object -ComObject WMPlayer.OCX
  $player.settings.autoStart = $false
  $player.settings.volume = [Math]::Max(0, [Math]::Min(100, $Volume))
  $player.settings.mute = [bool]$Muted
  $player.URL = $AudioUrl

  Start-Sleep -Milliseconds 350

  if ($StartSeconds -gt 0) {
    try {
      $player.controls.currentPosition = [double]$StartSeconds
    } catch {
      # Ignore early seek races while media is still warming up.
    }
  }

  $player.controls.play()
  [Console]::Out.WriteLine("ready")

  while (($line = [Console]::In.ReadLine()) -ne $null) {
    $command = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($command)) {
      continue
    }

    if ($command -eq "quit") {
      break
    }

    if ($command -eq "pause") {
      $player.controls.pause()
      continue
    }

    if ($command -eq "play") {
      $player.controls.play()
      continue
    }

    if ($command -match '^seek\s+([0-9]+(?:\.[0-9]+)?)$') {
      $player.controls.currentPosition = [double]$Matches[1]
      continue
    }

    if ($command -match '^volume\s+(\d+)$') {
      $player.settings.volume = [Math]::Max(0, [Math]::Min(100, [int]$Matches[1]))
      continue
    }

    if ($command -match '^mute\s+(on|off)$') {
      $player.settings.mute = $Matches[1] -eq 'on'
      continue
    }
  }

  $player.controls.stop()
  $player.close()
} catch {
  $message = $_.Exception.Message -replace "`r?`n", " "
  [Console]::Out.WriteLine("error:$message")
  exit 1
}
