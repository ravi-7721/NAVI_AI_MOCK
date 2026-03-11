$ErrorActionPreference = "Stop"

$standaloneRoot = Join-Path $PSScriptRoot "..\.next\standalone"
$standaloneStatic = Join-Path $standaloneRoot ".next\static"
$staticSource = Join-Path $PSScriptRoot "..\.next\static"
$publicSource = Join-Path $PSScriptRoot "..\public"
$publicTarget = Join-Path $standaloneRoot "public"

if (-not (Test-Path $standaloneRoot)) {
  throw "Standalone build was not found. Run npm run build first."
}

New-Item -ItemType Directory -Force -Path $standaloneStatic | Out-Null
Copy-Item -Path (Join-Path $staticSource "*") -Destination $standaloneStatic -Recurse -Force

New-Item -ItemType Directory -Force -Path $publicTarget | Out-Null
Copy-Item -Path (Join-Path $publicSource "*") -Destination $publicTarget -Recurse -Force
