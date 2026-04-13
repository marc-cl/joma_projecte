@echo off
setlocal ENABLEDELAYEDEXPANSION

set "ROOT=%~dp0"
set "FRONTEND_PORT=5510"
set "CHECK_ONLY=0"

if /I "%~1"=="--check" set "CHECK_ONLY=1"

echo [dev] Workspace: %ROOT%

echo [dev] Comprovant eines disponibles...
set "HAS_PYTHON=0"
set "HAS_PY=0"
set "HAS_NPX=0"

where python >nul 2>&1 && set "HAS_PYTHON=1"
where py >nul 2>&1 && set "HAS_PY=1"
where npx >nul 2>&1 && set "HAS_NPX=1"

where mvn >nul 2>&1
if errorlevel 1 (
  echo [error] Maven no trobat al PATH. Instal-la Maven o obre VS Code amb l'entorn Java configurat.
  exit /b 1
)

if "%CHECK_ONLY%"=="1" (
  echo [ok] Maven disponible.
  if "%HAS_PYTHON%"=="1" (
    echo [ok] Python disponible: python
  ) else (
    if "%HAS_PY%"=="1" (
      echo [ok] Python disponible: py
    ) else (
      if "%HAS_NPX%"=="1" (
        echo [ok] Servidor frontend disponible via npx serve
      ) else (
        echo [warn] No s'ha trobat python/py ni npx. El frontend no es podra servir per HTTP.
      )
    )
  )
  exit /b 0
)

echo [dev] Arrencant backend (Jetty) a http://localhost:8080/backend-1.0-SNAPSHOT ...
start "Backend Jetty" cmd /k "cd /d "%ROOT%backend" && mvn jetty:run"

echo [dev] Arrencant servidor frontend a http://localhost:%FRONTEND_PORT% ...
if "%HAS_PYTHON%"=="1" (
  start "Frontend HTTP" cmd /k "cd /d "%ROOT%frontend" && python -m http.server %FRONTEND_PORT%"
) else (
  if "%HAS_PY%"=="1" (
    start "Frontend HTTP" cmd /k "cd /d "%ROOT%frontend" && py -m http.server %FRONTEND_PORT%"
  ) else (
    if "%HAS_NPX%"=="1" (
      start "Frontend HTTP" cmd /k "cd /d "%ROOT%frontend" && npx --yes serve -l %FRONTEND_PORT% ."
    ) else (
      echo [warn] No hi ha servidor HTTP per al frontend (python/py/npx). Obre frontend amb Live Server.
    )
  )
)

echo [dev] Fet. Obre: http://localhost:%FRONTEND_PORT%/pages/login.html
exit /b 0
