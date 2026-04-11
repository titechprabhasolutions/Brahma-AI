$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"

if (Test-Path $venvPython) {
  $python = $venvPython
} else {
  $python = "python"
}

Push-Location $projectRoot
try {
  if (Test-Path ".\bk") {
    Remove-Item -LiteralPath ".\bk" -Recurse -Force
  }
  & $python -m PyInstaller --noconfirm --clean --distpath "." ".\backend.spec"
  if ($LASTEXITCODE -ne 0) {
    throw "Backend build failed."
  }
}
finally {
  Pop-Location
}
