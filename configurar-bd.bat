@echo off
echo =======================================
echo  SIGAM - Configuracion Base de Datos
echo =======================================
echo.

echo [1/4] Creando base de datos SIGAM...
echo Por favor ingresa la password de PostgreSQL cuando te la pida
psql -U postgres -c "CREATE DATABASE sigam;"
if errorlevel 1 (
    echo.
    echo NOTA: Si ya existe la BD, es normal ver un error
    echo.
)

echo [2/4] Generando cliente Prisma...
cd backend
call npx prisma generate

echo [3/4] Ejecutando migraciones...
call npx prisma migrate dev --name init

echo [4/4] Cargando datos iniciales (seed)...
call npm run seed

cd ..
echo.
echo =======================================
echo  Base de datos configurada!
echo =======================================
echo.
echo Ahora puedes ejecutar: inicio.bat
echo.
pause
