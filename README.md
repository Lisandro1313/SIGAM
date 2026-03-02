# SIGAM - Sistema Integral de Gestión Alimentaria Municipal

## 📋 Descripción
Sistema web profesional para gestión de entrega de mercadería alimentaria a espacios sociales, comedores, organizaciones y casos particulares. Maneja stock en dos depósitos (LOGISTICA y CITA), genera cronogramas automáticos, emite remitos y controla entregas.

## 🏗️ Arquitectura
- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Material-UI
- **Base de Datos**: PostgreSQL
- **Generación PDF**: Puppeteer
- **Emails**: Nodemailer

## 📁 Estructura del Proyecto
```
.
├── backend/          # API en NestJS
├── frontend/         # UI en React
├── docs/            # Documentación
└── scripts/         # Utilidades y migración
```

## 🚀 Características Principales
- ✅ Gestión de beneficiarios (comedores, organizaciones, casos particulares)
- ✅ Control de stock en dos depósitos (LOGISTICA y CITA)
- ✅ Generación automática de cronogramas mensuales
- ✅ Plantillas de entrega por programa
- ✅ Generación masiva de remitos
- ✅ Confirmación de remitos con descuento automático de stock
- ✅ Generación de PDF y envío por email
- ✅ Reportes por kilos, artículos, localidad y programa
- ✅ Mapa interactivo de entregas
- ✅ Trazabilidad total (auditoría completa de movimientos)
- ✅ Sistema de permisos por roles

## 🎯 Módulos del Sistema
1. **Programas**: Espacios, Casos Particulares, Celiaquía, Vaso de Leche, Panificados
2. **Beneficiarios**: Gestión completa de receptores
3. **Inventario**: Control por depósito con trazabilidad
4. **Cronograma**: Generación automática mensual
5. **Remitos**: Creación, confirmación y envío
6. **Reportes**: Análisis por múltiples dimensiones
7. **Usuarios**: Control de acceso por roles

## 🔐 Roles del Sistema
- **ADMIN**: Configuración completa del sistema
- **LOGISTICA**: Gestión de stock, confirmación de remitos
- **OPERADOR_PROGRAMA**: Gestión de beneficiarios y plantillas de su programa
- **VISOR**: Solo lectura (reportes)

## 📦 Instalación Rápida

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configurar DATABASE_URL en .env
npx prisma migrate dev
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔄 Migración desde Excel
Ver `scripts/importar-desde-excel/` para importar datos históricos.

## 📊 Base de Datos
Modelo completo en `backend/prisma/schema.prisma`
- 2 Depósitos
- Trazabilidad total de movimientos
- Cronograma automático
- Plantillas por programa

## 🛠️ Stack Tecnológico
- Node.js 18+
- PostgreSQL 14+
- React 18+
- TypeScript 5+
- Prisma ORM
- NestJS Framework

---

**Municipalidad de La Plata - Secretaría de Desarrollo Social**
