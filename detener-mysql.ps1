$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
& node scripts/stop-local.js
