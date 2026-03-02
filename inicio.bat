@echo off
echo =======================================
echo  SIGAM - Inicio Rapido
echo =======================================
echo.

echo [1/3] Iniciando Backend...
start "SIGAM-Backend" cmd /k "cd backend && npm run start:dev"
timeout /t 5

echo [2/3] Esperando que el backend este listo...
timeout /t 10

echo [3/3] Iniciando Frontend...
start "SIGAM-Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =======================================
echo  Sistema iniciado!
echo =======================================
echo  Backend:  http://localhost:3000/api
echo  Swagger:  http://localhost:3000/api/docs
echo  Frontend: http://localhost:5173
echo =======================================
echo.
echo Usuario: admin@municipalidad.gob.ar
echo Password: admin123
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
