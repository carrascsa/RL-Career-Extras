# Builds the playtest zip: dist\RL-Career-Extras-<version>.zip
#   powershell -ExecutionPolicy Bypass -File release\build-release.ps1
# Only the add-on goes in: src (without tests or caches), the English launcher, installer, uninstaller, README.
param([string]$Version = '0.1.0-beta')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$name = "RL-Career-Extras-$Version"
$dist = Join-Path $root 'dist'
$stage = Join-Path $dist $name
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force (Join-Path $stage 'app') | Out-Null

# the add-on itself
robocopy (Join-Path $root 'src') (Join-Path $stage 'app\src') /E /XD __pycache__ /XF *.pyc /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "copy failed ($LASTEXITCODE)" }

# text files: Windows line endings for the .cmd files (cmd.exe misreads LF-only batch files)
function Copy-Text($from, $to, [switch]$Crlf) {
  $t = [IO.File]::ReadAllText($from)
  if ($Crlf) { $t = ($t -replace "`r`n", "`n") -replace "`n", "`r`n" }
  [IO.File]::WriteAllText($to, $t, (New-Object Text.UTF8Encoding $false))
}
Copy-Text (Join-Path $PSScriptRoot 'Start RL Career Extras.cmd') (Join-Path $stage 'app\Start RL Career Extras.cmd') -Crlf
Copy-Text (Join-Path $PSScriptRoot 'INSTALL.cmd') (Join-Path $stage 'INSTALL.cmd') -Crlf
Copy-Text (Join-Path $PSScriptRoot 'UNINSTALL.cmd') (Join-Path $stage 'UNINSTALL.cmd') -Crlf
Copy-Text (Join-Path $root 'README.md') (Join-Path $stage 'README.md')
Copy-Text (Join-Path $root 'LICENSE') (Join-Path $stage 'LICENSE.txt')
Copy-Text (Join-Path $root 'THIRD_PARTY_NOTICES.md') (Join-Path $stage 'THIRD_PARTY_NOTICES.md')
Set-Content -LiteralPath (Join-Path $stage 'app\VERSION.txt') -Value "RL Career Extras $Version (tested with RL Career Hub 0.2.0-beta.33)" -Encoding ASCII

$zip = Join-Path $dist "$name.zip"
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path $stage -DestinationPath $zip -CompressionLevel Optimal
$mb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Output "Built $zip ($mb MB)"
