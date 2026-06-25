@echo off
title Iniciar Aura Business
echo Iniciando el servidor local de Aura Business...
cd /d "C:\Users\AFLAND\antigravity\aura-V-2.0"

:: Iniciar el servidor de desarrollo en una nueva ventana
start "Aura Server" cmd /c "npm run dev"

echo Esperando 5 segundos a que el servidor local inicialice...
timeout /t 5 /nobreak > NUL

echo Abriendo el Panel de Admin y la TV en tu navegador predeterminado...
start http://localhost:3000/admin
start http://localhost:3000/tv

echo.
echo Proceso de inicio completado.
echo Puedes mantener minimizada la ventana del servidor para mantener la app activa.
echo.
pause
