@echo off
title Lanzador de Streaming Local Aura TV
echo ==============================================
echo       Lanzador de Streaming Local Aura TV
echo ==============================================
echo.
echo Iniciando el motor de captura de pantalla...
echo Asegurate de que FFmpeg esta instalado en tu sistema.
echo.
echo Presiona Ctrl+C en cualquier momento para detener la transmision.
echo.

set STREAM_KEY=3lxY0IcAPobwLVbssVk3AWo58uk2
set R2_UPLOAD_ENABLED=true
set AURA_TV_URL=http://localhost:3000/tv/%STREAM_KEY%?stream=true

:: Cargar credenciales del archivo .env local
for /f "usebackq tokens=1,2 delims==" %%i in (".env") do (
    if not "%%i"=="" if not "%%j"=="" (
        set %%i=%%j
    )
)

node scratch/stream-orchestrator-windows.cjs

pause
