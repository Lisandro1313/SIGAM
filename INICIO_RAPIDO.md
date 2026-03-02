# SIGAM - Guía de Inicio Rápido

## 🚀 Primera vez (Instalación)

### 1. Requisitos Previos
- ✅ Node.js 18+ instalado
- ✅ PostgreSQL 14+ instalado y corriendo
- ✅ npm 9+

### 2. Instalación Automática (Windows)

```bash
# Ejecutar el script de instalación
instalar.bat
```

O manualmente:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configurar Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE sigam;
\q
```

### 4. Configurar Variables de Entorno

Editar `backend/.env` (copiar desde `.env.example`):

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/sigam"
JWT_SECRET="tu_secret_super_seguro"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="tu-email@gmail.com"
SMTP_PASS="tu-app-password"
```

### 5. Ejecutar Migraciones y Seed

```bash
cd backend
npx prisma migrate dev
npm run seed
```

## ▶️ Inicio Diario

### Opción 1: Script Automático (Windows)
```bash
inicio.bat
```

### Opción 2: Manual

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 🔗 URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api/docs
- **Prisma Studio**: `cd backend && npx prisma studio`

## 🔑 Credenciales

```
Email: admin@municipalidad.gob.ar
Password: admin123
```

## 📖 Flujo de Trabajo Típico

### 1. Gestionar Stock
1. Ir a **Stock**
2. Seleccionar depósito (LOGISTICA o CITA)
3. Clic en **Registrar Ingreso** para agregar mercadería
4. Ver alertas de stock bajo

### 2. Crear Remito Manual
1. Ir a **Remitos**
2. Clic **Nuevo Remito**
3. Seleccionar beneficiario y depósito
4. Agregar artículos y cantidades
5. Clic **Confirmar** (valida y descuenta stock)
6. **Descargar PDF** o **Enviar Email**

### 3. Cronograma Automático
1. Ir a **Cronograma**
2. **Generar Cronograma Mensual**: crea entregas programadas
3. **Generar Remitos Masivos**: crea todos los remitos del mes con plantillas
4. Ver resultado: remitos generados y errores

### 4. Ver Reportes
1. Ir a **Reportes**
2. Ver gráficos de distribución por mes
3. Top artículos distribuidos
4. Entregas por programa
5. Stock bajo

## ❓ Solución de Problemas

### Backend no inicia
```bash
# Verificar que PostgreSQL está corriendo
# Verificar DATABASE_URL en .env
# Verificar que existe la base de datos
psql -U postgres -c "\l" | grep sigam
```

### Frontend no conecta
```bash
# Verificar que backend está corriendo en puerto 3000
# Verificar proxy en frontend/vite.config.ts
```

### Error de migraciones
```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev
npm run seed
```

### Olvidé la contraseña
```bash
cd backend
npm run seed  # Resetea usuarios a valores por defecto
```

## 📚 Más Información

- [README Principal](README.md) - Visión general del proyecto
- [Instalación Backend](backend/INSTALACION.md) - Guía detallada backend
- [Frontend README](frontend/README.md) - Documentación frontend
- [Swagger API Docs](http://localhost:3000/api/docs) - Documentación interactiva API

## 🆘 Soporte

Para problemas o consultas:
1. Verificar logs del backend (terminal 1)
2. Verificar logs del frontend (terminal 2)
3. Revisar Swagger docs para probar endpoints: http://localhost:3000/api/docs
4. Usar Prisma Studio para ver datos: `cd backend && npx prisma studio`
