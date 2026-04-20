@echo off
setlocal
cd /d %~dp0\..

echo Installing dependencies...
call npm install --registry=https://registry.npmmirror.com
if errorlevel 1 goto :fail

echo Building Windows installer...
call npm run dist:win
if errorlevel 1 goto :fail

echo Done.
echo Output folder: dist
exit /b 0

:fail
echo Build failed. Check the log above.
exit /b 1
