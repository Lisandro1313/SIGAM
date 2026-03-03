@echo off
echo =======================================
echo  SIGAM - Crear Base de Datos
echo =======================================
echo.

set PGPASSWORD=Cocoliso13!

echo Intentando crear base de datos 'sigam'...
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d postgres -c "DROP DATABASE IF EXISTS sigam;"
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d postgres -c "CREATE DATABASE sigam;"

if errorlevel 1 (
    echo.
    echo =======================================
    echo  ERROR: No se pudo crear la base de datos
    echo =======================================
    echo.
    echo Posibles soluciones:
    echo 1. Verifica que la contraseña sea correcta
    echo 2. Abre SQL Shell ^(psql^) desde el menú de inicio
    echo 3. Cuando pida datos, presiona ENTER 4 veces
    echo 4. Ingresa la contraseña de postgres
    echo 5. Ejecuta: CREATE DATABASE sigam;
    echo 6. Ejecuta: \q para salir
    echo.
    pause
    exit /b 1
)

echo.
echo =======================================
echo  Base de datos creada exitosamente!
echo =======================================
echo.
pause
