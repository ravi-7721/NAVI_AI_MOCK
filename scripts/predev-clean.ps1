$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$lockPath = Join-Path $projectRoot ".next\dev\lock"

function Stop-NodeListenersOnDevPorts {
  $ports = @(3000, 3001, 3002)
  $portPattern = ($ports -join "|")
  $lines = netstat -ano -p tcp | Select-String -Pattern ":(?:$portPattern)\s"
  $pids = @()

  foreach ($line in $lines) {
    $parts = ($line.ToString().Trim() -split "\s+") | Where-Object { $_ -ne "" }
    if ($parts.Length -lt 5) {
      continue
    }

    $state = $parts[3]
    $procId = $parts[4]

    if ($state -eq "LISTENING" -and $procId -match "^\d+$") {
      $pids += [int]$procId
    }
  }

  $uniqueProcIds = $pids | Sort-Object -Unique
  foreach ($procId in $uniqueProcIds) {
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq "node") {
      try {
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Write-Host "Stopped stale node process on dev port: $procId"
      } catch {
        Write-Host "Could not stop node process ${procId}: $($_.Exception.Message)"
      }
    }
  }
}

function Remove-LockFile {
  if (-not (Test-Path $lockPath)) {
    return
  }

  for ($i = 0; $i -lt 10; $i++) {
    try {
      Remove-Item $lockPath -Force -ErrorAction Stop
      Write-Host "Removed stale Next.js lock file."
      return
    } catch {
      Start-Sleep -Milliseconds 250
    }
  }

  if (Test-Path $lockPath) {
    Write-Warning "Could not remove lock file at $lockPath. Another process may still be active."
  }
}

Stop-NodeListenersOnDevPorts
Remove-LockFile
