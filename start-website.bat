@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
  goto :eof
)

set CODEX_NODE=C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe
if exist "%CODEX_NODE%" (
  "%CODEX_NODE%" server.js
  goto :eof
)

echo ???? Node.js?
echo ??? Node.js?????????? Python ?????
pause
