# SIGAM — Handover para continuar desde otra PC

> Fecha: 22/03/2026
> Estado: Todos los ítems del roadmap completados + Rendición ANEXO VI. Próxima fase: integraciones WhatsApp y Email.

---

## Estado del sistema

El sistema está completamente funcional con las siguientes mejoras incorporadas en las últimas sesiones:

### Lo que se hizo (resumen)

| Área | Mejoras |
|------|---------|
| Beneficiarios | Paginación server-side, búsqueda server-side, detección duplicados DNI, próxima entrega en detalle, exportar Excel (todos los filtrados), historial de cambios (ADMIN + OPERADOR) |
| Casos Particulares | Alertas de cruce prominentes (chip + banner), stock disponible para revisores, botón convertir a beneficiario desde APROBADO/RESUELTO, subir/bajar documentos |
| Remitos | Filtro de estado persistente en URL (q=, tab=, estado=) |
| Stock | CRUD de lotes/vencimientos, ajuste de stock (reconciliación física), ajuste por fila o por formulario |
| Mapa | Contador "sin GPS", exportar localidad a Excel, frecuencia entrega en popup |
| Auditoría | Exportar a Excel, atajos de período (Hoy / 7d / 30d / Este mes) |
| Rendición | Pestaña en Reportes: selector bimestre + programa → genera ANEXO VI (.xlsx) con beneficiarios que retiraron + hoja de ingresos de mercadería |
| WhatsApp | Botón en remitos con mensaje precargado (wa.me), mensaje configurable por programa con variables |
| Layout | Búsqueda global Ctrl+K (beneficiarios, casos, remitos) |
| Performance | React.lazy() en todas las páginas, paginación server-side |

---

## Arquitectura

```
SIGAM/
├── backend/       NestJS + Prisma + PostgreSQL (Supabase)
│   ├── src/modules/
│   │   ├── auth/          JWT, roles
│   │   ├── beneficiarios/ CRUD + docs + integrantes + cruce
│   │   ├── casos/         Casos particulares + documentos
│   │   ├── cronograma/    Planilla + generación masiva remitos
│   │   ├── remitos/       Ciclo completo + PDF + email
│   │   ├── stock/         Ingreso + transferencia + ajuste + lotes
│   │   ├── reportes/      Dashboard + sin-entrega + búsqueda global
│   │   ├── auditoria/     Log de actividad + interceptor
│   │   └── eventos/       SSE tiempo real
│   └── prisma/schema.prisma
│
└── frontend/      React + TypeScript + MUI v5
    ├── src/
    │   ├── pages/         Una página por módulo
    │   ├── components/    Formularios reutilizables
    │   ├── stores/        Zustand (auth, notificaciones)
    │   └── services/api.ts  axios con JWT
```

### Roles del sistema

| Rol | Acceso |
|-----|--------|
| ADMIN | Todo |
| OPERADOR_PROGRAMA | Beneficiarios, remitos, cronograma (sin stock) |
| TRABAJADORA_SOCIAL | Mis casos + relevamiento beneficiarios |
| ASISTENCIA_CRITICA | Interfaz CITA completa (igual a PA pero datos separados) |
| LOGISTICA | Stock, depósito, transferencias |
| VISOR | Solo lectura en todo |

### Multi-secretaría
- Secretaria **PA** = datos por defecto
- Secretaria **CITA** = rol ASISTENCIA_CRITICA, datos completamente separados
- Campo `secretaria` en: Beneficiario, Remito, Articulo, EntregaProgramada, Stock

---

## Próxima fase: Integraciones WhatsApp + Email

### WhatsApp — Avisos de retiro

**Objetivo:** enviar mensaje automático a beneficiarios cuando un remito es confirmado/programado.

**Opción recomendada:** Twilio WhatsApp API (o Meta Cloud API)
- El endpoint ya existe: `POST /remitos/:id/enviar` (email)
- Crear un módulo `whatsapp.service.ts` similar al de email
- Disparar desde `remitos.service.ts` en `confirmar()` o `registrarEntrega()`

**Plantilla de mensaje sugerida:**
```
Hola {{nombre}}, su asistencia está lista para retirar.
📅 Fecha: {{fecha}}
🕐 Horario: {{hora}}
📍 Lugar: {{deposito}}
Para consultas: {{telefono_oficina}}
```

**Variables a pasar:** `beneficiario.nombre`, `beneficiario.telefono`, `entrega.fechaProgramada`, `entrega.hora`, `deposito.nombre`

**Pasos de implementación:**
1. Crear cuenta Twilio / configurar número sandbox
2. Instalar `npm install twilio` en backend
3. Crear `backend/src/shared/whatsapp/whatsapp.service.ts`
4. Agregar variables de entorno: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
5. Inyectar en `RemitosModule` y llamar desde `confirmar()`
6. Agregar botón "Enviar WhatsApp" en el drawer del remito (similar al botón de email)

### Email — Informes formales

**Lo que ya existe:**
- `POST /remitos/:id/enviar` — envía PDF del remito por email a depósitos
- Módulo `mailer.service.ts` con nodemailer

**Lo que falta para informes:**
- Endpoint `POST /reportes/exportar-pdf` — genera PDF del período
- Plantillas HTML para informes mensuales
- Botón "Enviar informe" en página de Reportes

**Sugerencia para informes:**
- Usar `@nestjs/bull` + queue para enviar informes grandes sin timeout
- O simplemente: botón descarga Excel/PDF + envío manual desde email de oficina

---

## Variables de entorno necesarias (backend/.env)

```env
DATABASE_URL=postgresql://...supabase...
JWT_SECRET=...
STORAGE_TYPE=local   # o "supabase"
SUPABASE_URL=...
SUPABASE_KEY=...

# Email (ya configurado)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...

# WhatsApp (a configurar)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # sandbox Twilio
```

---

## Cómo levantar en otra PC

```bash
# Backend
cd backend
npm install
npx prisma generate
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

---

## Endpoints clave para WhatsApp (a crear)

```
POST /whatsapp/test         → Probar envío
POST /remitos/:id/whatsapp  → Enviar aviso de retiro
POST /cronograma/avisos     → Enviar avisos masivos del día
```

---

## Archivos a tocar para integrar WhatsApp

| Archivo | Qué hacer |
|---------|-----------|
| `backend/src/shared/whatsapp/whatsapp.service.ts` | Crear — wrapper Twilio |
| `backend/src/modules/remitos/remitos.service.ts` | Llamar whatsapp.enviarAviso() en confirmar() |
| `backend/src/modules/remitos/remitos.controller.ts` | Agregar endpoint POST /:id/whatsapp |
| `frontend/src/pages/Remitos.tsx` | Agregar botón WhatsApp en acciones del remito |
| `frontend/src/pages/Cronograma.tsx` | Botón "Enviar avisos del día" |

---

## Notas importantes

- El sistema usa **Supabase** como DB y storage en producción
- Las fotos de firma de entrega se guardan en `uploads/remitos/`
- PDF de remitos se genera con `pdfmake` en el backend
- Los archivos de documentos de beneficiarios van a `uploads/beneficiarios/`
- La auditoría registra automáticamente todas las mutaciones (interceptor global)
- El tiempo real usa **SSE** (Server-Sent Events), no WebSocket — compatible con proxies

---

*Generado automáticamente — sesión de desarrollo 21/03/2026*
