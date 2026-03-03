@echo off
echo =======================================
echo  SIGAM - Configuración Rápida
echo =======================================
echo.

echo Ingresa la contraseña de PostgreSQL (usuario: postgres)
set /p PGPASSWORD="Contraseña: "

echo.
echo Actualizando archivo .env...
powershell -Command "(Get-Content backend\.env) -replace 'postgresql://postgres:postgres@', 'postgresql://postgres:%PGPASSWORD%@' | Set-Content backend\.env"

echo.
echo [1/3] Creando base de datos...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS sigam; CREATE DATABASE sigam;"

if errorlevel 1 (
    echo ERROR: No se pudo crear la base de datos
    echo Verifica que la contraseña sea correcta
    pause
    exit /b 1
)

echo.
echo [2/3] Ejecutando migraciones...
cd backend
call npx prisma migrate dev --name init

if errorlevel 1 (
    echo ERROR: Falló la migración
    pause
    exit /b 1
)

echo.
echo [3/3] Poblando base de datos con datos iniciales...
call npm run seed

if errorlevel 1 (
    echo ERROR: Falló el seed
    pause
    exit /b 1
)

cd ..

echo.
echo =======================================
echo  ¡Sistema configurado correctamente!
echo =======================================
echo.
echo Ahora puedes ejecutar: inicio.bat
echo.
pause
