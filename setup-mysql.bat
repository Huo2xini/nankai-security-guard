@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Nankai Security Guard - MySQL setup
set /p MYSQL_USER=MySQL user [root]: 
if "%MYSQL_USER%"=="" set MYSQL_USER=root
set /p MYSQL_PASSWORD=MySQL password: 
set /p MYSQL_DATABASE=Database name [nankai_security_guard]: 
if "%MYSQL_DATABASE%"=="" set MYSQL_DATABASE=nankai_security_guard

(
  echo DB_MODE=mysql
  echo MYSQL_CLI=D:\mysql-8.0.31-winx64\bin\mysql.exe
  echo MYSQL_HOST=127.0.0.1
  echo MYSQL_PORT=3306
  echo MYSQL_USER=%MYSQL_USER%
  echo MYSQL_PASSWORD=%MYSQL_PASSWORD%
  echo MYSQL_DATABASE=%MYSQL_DATABASE%
  echo PORT=8018
) > .env

set CODEX_NODE=C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe
if exist "%CODEX_NODE%" (
  "%CODEX_NODE%" scripts\mysql-init.js
) else (
  node scripts\mysql-init.js
)

pause
