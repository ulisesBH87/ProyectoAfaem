@echo off
REM SCRIPT PARA INICIAR BACKEND Y FRONTEND JUNTOS
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ========================================
echo AFAEM - Iniciando Backend y Frontend
echo ========================================
echo.

REM INICIAR BACKEND EN UNA NUEVA VENTANA
echo Iniciando Backend en puerto 8000...
start cmd.exe /k "cd backend && start_uvicorn.bat"

REM ESPERAR UN POCO ANTES DE INICIAR FRONTEND
timeout /t 3 /nobreak

REM INICIAR FRONTEND EN OTRA VENTANA
echo Iniciando Frontend en puerto 5173...
start cmd.exe /k "npm run dev"

echo.
echo ========================================
echo Servidores iniciados:
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo ========================================
echo.
timeout /t 5 /nobreak
