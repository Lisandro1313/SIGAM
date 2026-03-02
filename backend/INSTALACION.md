# 🚀 Guía de Instalación y Puesta en Marcha - SIGAM Backend

## Requisitos Previos
- Node.js 18 o superior
- PostgreSQL 14 o superior
- npm o yarn

## 1️⃣ Instalación

### Paso 1: Instalar dependencias
```bash
cd backend
npm install
```

### Paso 2: Configurar variables de entorno
```bash
# Copiar el archivo de ejemplo
copy .env.example .env

# Editar .env y configurar:
# - DATABASE_URL (conexión a PostgreSQL)
# - JWT_SECRET
# - Configuración SMTP para emails
```

Ejemplo de `DATABASE_URL`:
```
DATABASE_URL="postgresql://usuario:password@localhost:5432/sigam?schema=public"
```

### Paso 3: Crear base de datos PostgreSQL
```bash
# Desde psql o PgAdmin, crear la base de datos
CREATE DATABASE sigam;
```

### Paso 4: Ejecutar migraciones
```bash
npx prisma migrate dev --name init
```

### Paso 5: Cargar datos iniciales (seed)
```bash
npm run seed
```

## 2️⃣ Ejecutar en Desarrollo

```bash
npm run start:dev
```

El servidor estará disponible en:
- **API**: http://localhost:3000/api
- **Swagger (Docs)**: http://localhost:3000/api/docs

## 3️⃣ Credenciales Iniciales

El seed crea un usuario administrador:
- **Email**: `admin@municipalidad.gob.ar`
- **Password**: `admin123`

**⚠️ IMPORTANTE**: Cambiar la contraseña en producción.

## 4️⃣ Probar la API

### Desde Swagger
1. Ir a http://localhost:3000/api/docs
2. Click en `/api/auth/login`
3. Click en "Try it out"
4. Ingresar credenciales:
```json
{
  "email": "admin@municipalidad.gob.ar",
  "password": "admin123"
}
```
5. Copiar el `access_token` de la respuesta
6. Click en "Authorize" (arriba a la derecha)
7. Pegar el token y autorizar
8. ¡Ya podés usar todos los endpoints!

### Desde Postman o curl

**1. Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@municipalidad.gob.ar","password":"admin123"}'
```

**2. Usar el token en otros endpoints:**
```bash
curl -X GET http://localhost:3000/api/programas \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## 5️⃣ Comandos Útiles

```bash
# Desarrollo con hot-reload
npm run start:dev

# Build para producción
npm run build

# Ejecutar en producción
npm run start:prod

# Ver base de datos en navegador
npx prisma studio

# Generar nueva migración
npx prisma migrate dev --name nombre_migracion

# Resetear base de datos (¡CUIDADO!)
npx prisma migrate reset

# Ver logs de SQL
DATABASE_URL="..." npx prisma studio --browser none
```

## 6️⃣ Estructura de la Base de Datos

Ver modelo completo en `prisma/schema.prisma`

### Tablas Principales:
- **Usuario**: Usuarios del sistema
- **Programa**: Programas de asistencia (Espacios, Celiaquía, etc)
- **Beneficiario**: Comedores, organizaciones, casos particulares
- **Deposito**: LOGISTICA y CITA
- **Articulo**: Productos disponibles
- **Stock**: Stock por artículo y depósito
- **Movimiento**: Trazabilidad de todos los movimientos
- **Plantilla**: Plantillas de entrega por programa
- **EntregaProgramada**: Cronograma de entregas
- **Remito**: Remitos emitidos
- **RemitoItem**: Items de cada remito

## 7️⃣ Flujos Principales

### Flujo 1: Crear Remito Manual
1. POST `/api/remitos` (crear borrador)
2. POST `/api/remitos/:id/confirmar` (confirmar y descontar stock)
3. GET `/api/remitos/:id/pdf` (descargar PDF)
4. POST `/api/remitos/:id/enviar` (enviar por email)

### Flujo 2: Generación Masiva
1. POST `/api/cronograma/generar` (generar cronograma del mes)
2. POST `/api/cronograma/generar-remitos-masivos` (crear todos los remitos)
3. Confirmar y enviar cada uno

### Flujo 3: Ingreso de Mercadería
1. POST `/api/stock/ingreso` (registrar ingreso)
2. Stock se actualiza automáticamente

## 8️⃣ Configuración de Email

Para que el envío de remitos por email funcione, configurar en `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
SMTP_FROM="Secretaría de Desarrollo Social <deposito@municipalidad.gob.ar>"
DEPOSITO_EMAIL=deposito@municipalidad.gob.ar
```

**Para Gmail**: Crear una "App Password" en https://myaccount.google.com/apppasswords

## 9️⃣ Troubleshooting

### Error: "Can't reach database server"
- Verificar que PostgreSQL esté corriendo
- Verificar DATABASE_URL en .env
- Verificar firewall/puerto 5432

### Error: "Unknown argument: seed"
```bash
# El script de seed necesita ts-node
npm install -D ts-node
```

### Error en migraciones
```bash
# Resetear todo (¡perderás datos!)
npx prisma migrate reset
```

### Puerto 3000 en uso
```bash
# Cambiar PORT en .env
PORT=3001
```

## 🔟 Próximos Pasos

1. ✅ Backend funcionando
2. 🔄 Conectar con Frontend React
3. 📱 Probar flujos completos
4. 🚀 Deploy a producción

---

**¿Necesitás ayuda?** Revisar logs en consola o los errores en Swagger.
