$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Instala Node.js 22 o superior.' }
if (-not (Test-Path -LiteralPath 'node_modules/mysql2')) { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' } }
& node scripts/local.js
