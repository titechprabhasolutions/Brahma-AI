$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"

if (Test-Path $venvPython) {
  $python = $venvPython
} else {
  $python = $env:BRAHMA_PYTHON
  if (-not $python) {
    $userHome = [Environment]::GetFolderPath("UserProfile")
    $localAppData = $env:LOCALAPPDATA
    if (-not $localAppData) {
      $localAppData = Join-Path $userHome "AppData\Local"
    }
    $candidates = @(
      (Join-Path $userHome "Miniconda3\python.exe"),
      (Join-Path $userHome "Anaconda3\python.exe"),
      (Join-Path $localAppData "Programs\Python\Python313\python.exe"),
      (Join-Path $localAppData "Programs\Python\Python312\python.exe"),
      (Join-Path $localAppData "Programs\Python\Python311\python.exe"),
      (Join-Path $localAppData "Programs\Python\Python310\python.exe")
    )

    foreach ($candidate in $candidates) {
      if (Test-Path $candidate) {
        $python = $candidate
        break
      }
    }
  }

  if (-not $python) {
    $python = "python"
  }
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
