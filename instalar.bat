@echo off
echo =======================================
echo  SIGAM - Instalacion Completa
echo =======================================
echo.

echo [1/5] Instalando dependencias del BACKEND...
cd backend
call npm install
if errorlevel 1 (
    echo ERROR: Fallo la instalacion del backend
    pause
    exit /b 1
)
echo.

echo [2/5] Configurando base de datos...
echo Por favor edita backend\.env con tus credenciales de PostgreSQL
echo Luego ejecuta manualmente:
echo   cd backend
echo   npx prisma migrate dev
echo   npm run seed
echo.
pause

echo [3/5] Instalando dependencias del FRONTEND...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo ERROR: Fallo la instalacion del frontend
    pause
    exit /b 1
)
cd ..
echo.

echo =======================================
echo  Instalacion completada!
echo =======================================
echo.
echo Siguientes pasos:
echo 1. Editar backend\.env con credenciales de PostgreSQL
echo 2. Crear base de datos: CREATE DATABASE sigam;
echo 3. cd backend
echo 4. npx prisma migrate dev
echo 5. npm run seed
echo 6. Ejecutar inicio.bat para arrancar el sistema
echo.
pause
