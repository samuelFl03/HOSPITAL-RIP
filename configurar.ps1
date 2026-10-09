$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
& npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }
& node scripts/local.js --setup-only
if ($LASTEXITCODE -ne 0) { throw 'La configuración no terminó. Consulta el mensaje anterior.' }
Write-Host 'Configuración lista. Abre iniciar.bat.'
