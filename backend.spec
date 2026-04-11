# PyInstaller spec for Brahma AI backend
# Builds an onedir distribution to ship inside Electron's resources/backend

import pathlib

# __file__ is not set when PyInstaller executes the spec; use cwd instead.
project_root = pathlib.Path(".").resolve()

block_cipher = None

hiddenimports = []
datas = []
binaries = []

# Collect package data for first-party modules that may have templates or assets
for pkg in ["actions", "agent", "core", "memory", "models"]:
    pkg_path = project_root / pkg
    if pkg_path.exists():
        datas.append((str(pkg_path), pkg))

# Include config json files
config_dir = project_root / "config"
if config_dir.exists():
    datas.append((str(config_dir), "config"))

# Bundle top-level helpers explicitly used at runtime
for fname in ["ui.py", "main.py"]:
    fpath = project_root / fname
    if fpath.exists():
        datas.append((str(fpath), "."))

a = Analysis(
    ["bridge_backend.py"],
    pathex=[str(project_root)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="brahma-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="bk",
)
