# SIGAM - Frontend

Frontend del Sistema Integral de Gestión Alimentaria Municipal.

## Tecnologías

- **React 18** con TypeScript
- **Vite** - Build tool
- **Material UI** - Framework de componentes
- **React Router** - Navegación
- **Zustand** - State management
- **Axios** - HTTP client
- **Recharts** - Gráficos
- **React Leaflet** - Mapas

## Instalación

```bash
npm install
```

## Configuración

El frontend se conecta al backend en `http://localhost:3000/api` mediante proxy configurado en Vite.

Si el backend está en otro puerto, editar `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:PUERTO_BACKEND',
    changeOrigin: true,
  },
}
```

## Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Credenciales por defecto

```
Email: admin@municipalidad.gob.ar
Password: admin123
```

## Estructura

```
src/
├── components/       # Componentes reutilizables
│   └── Layout.tsx   # Layout principal con sidebar
├── pages/           # Páginas (rutas)
│   ├── LoginPage.tsx
│   ├── Dashboard.tsx
│   ├── Programas.tsx
│   ├── Beneficiarios.tsx
│   ├── Articulos.tsx
│   ├── Stock.tsx
│   ├── Remitos.tsx
│   ├── Cronograma.tsx
│   └── Reportes.tsx
├── services/        # Servicios
│   └── api.ts      # Cliente Axios con interceptores
├── stores/          # Estado global (Zustand)
│   └── authStore.ts # Autenticación
├── App.tsx          # Rutas principales
└── main.tsx         # Entry point
```

## Características

### Autenticación
- Login con JWT
- Persistencia en localStorage
- Interceptor automático para agregar token
- Redirección a login si 401

### Dashboard
- KPIs: Beneficiarios, Remitos del mes, Programas, Stock total
- Carga datos desde `/api/reportes/dashboard`

### Módulos
- **Programas**: Lista programas con flags (usa cronograma, plantilla, descuenta stock)
- **Beneficiarios**: Tabla con tipo, localidad, frecuencia, ubicación
- **Artículos**: Lista con código, peso unitario, stock mínimo
- **Stock**: Tabs por depósito (LOGISTICA/CITA), alertas de stock bajo
- **Remitos**: Lista con acciones (confirmar, descargar PDF, enviar email)
- **Cronograma**: Generación automática de entregas y remitos masivos
- **Reportes**: Gráficos de kilos por mes, top artículos, entregas por programa

## Build para producción

```bash
npm run build
```

Los archivos estáticos se generan en `dist/`

## Próximos pasos

- Formularios para crear/editar (Programas, Beneficiarios, Artículos)
- Mapa con Leaflet mostrando ubicación de beneficiarios
- Filtros y búsqueda en tablas
- Paginación
- Notificaciones toast
- Confirmaciones de acciones destructivas
- Breadcrumbs
- Modo oscuro
