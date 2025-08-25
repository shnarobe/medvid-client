@echo off
REM launch medvid

start cmd.exe /k "cd /d C:\medvid && node rtspServer.js"
start cmd.exe /k "cd /d C:\medvid && node app.js"

exit