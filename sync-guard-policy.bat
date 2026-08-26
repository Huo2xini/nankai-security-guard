@echo off
setlocal
cd /d "%~dp0"
py -3 scripts\guard_policy_sync.py --limit 30 --output data\guard_policy_sync
if errorlevel 1 (
  python scripts\guard_policy_sync.py --limit 30 --output data\guard_policy_sync
)
endlocal
