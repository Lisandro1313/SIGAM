# SIGAM — Sistema Integral de Gestión Alimentaria Municipal
## Documentación completa · Versión 1.0 · Marzo 2026

---

## Índice

1. [¿Qué es SIGAM?](#1-qué-es-sigam)
2. [Tecnologías utilizadas](#2-tecnologías-utilizadas)
3. [Arquitectura del sistema](#3-arquitectura-del-sistema)
4. [Roles de usuario](#4-roles-de-usuario)
5. [Manual de usuario por rol](#5-manual-de-usuario-por-rol)
6. [Módulos y funciones](#6-módulos-y-funciones)
7. [Flujos de trabajo principales](#7-flujos-de-trabajo-principales)
8. [Integraciones](#8-integraciones)
9. [Glosario](#9-glosario)

---

## 1. ¿Qué es SIGAM?

**SIGAM** (Sistema Integral de Gestión Alimentaria Municipal) es un sistema web de gestión desarrollado para la **Secretaría de Desarrollo Social de la Municipalidad de La Plata**. Permite administrar y trazabilizar de punta a punta la distribución de asistencia alimentaria a familias, comedores comunitarios, espacios y organizaciones del municipio.

### ¿Qué resuelve?

| Antes | Con SIGAM |
|-------|-----------|
| Planillas Excel sin control de versiones | Base de datos centralizada, todo en tiempo real |
| No se sabía quién retiró cada pedido | Registro de entrega con foto de firma |
| Stock sin control de vencimientos | Lotes con fecha de vencimiento y alertas automáticas |
| Casos urgentes perdidos en papel | Módulo de casos con prioridades y workflow de aprobación |
| Informes armados a mano para la Provincia | Exportación automática del ANEXO VI |
| Sin coordinación entre depósitos | Transferencias entre depósitos con trazabilidad completa |

### Dos secretarías en un solo sistema

El sistema opera con **dos secretarías separadas** cuyos datos no se mezclan:
- **PA** (Política Alimentaria) — Programas regulares de distribución alimentaria
- **CITA** (Asistencia Crítica) — Atención de casos urgentes y críticos

---

## 2. Tecnologías utilizadas

### Backend

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| **NestJS** | v10 | Framework principal del servidor |
| **Node.js** | v20 | Runtime de JavaScript en servidor |
| **Prisma ORM** | v5 | Acceso a base de datos, migraciones |
| **PostgreSQL** | — | Base de datos relacional |
| **Supabase** | — | Hosting de base de datos + almacenamiento de archivos en producción |
| **JWT (JSON Web Tokens)** | — | Autenticación sin estado |
| **Passport.js** | — | Estrategias de autenticación (local + JWT) |
| **bcrypt** | — | Hash seguro de contraseñas |
| **Multer** | — | Subida de archivos (fotos, documentos) |
| **PDFKit** | — | Generación de PDFs de remitos e historial |
| **Nodemailer** | — | Envío de emails (remitos, avisos) |
| **@nestjs/throttler** | — | Rate limiting (máx. 5 intentos de login/minuto) |
| **class-validator** | — | Validación de datos entrantes |
| **Swagger** | — | Documentación automática de API |
| **date-fns** | — | Manejo de fechas y cálculos temporales |
| **SSE (Server-Sent Events)** | — | Actualizaciones en tiempo real |

### Frontend

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| **React** | v18 | Framework de interfaz de usuario |
| **TypeScript** | v5 | Tipado estático |
| **Vite** | v5 | Build tool y servidor de desarrollo |
| **Material-UI (MUI)** | v5 | Componentes de interfaz visual |
| **Zustand** | — | Manejo de estado global (autenticación, notificaciones) |
| **Axios** | — | Cliente HTTP para comunicación con la API |
| **React Router DOM** | v6 | Navegación entre páginas |
| **Recharts** | — | Gráficos de barras, tortas y tendencias |
| **Leaflet + react-leaflet** | — | Mapa interactivo de beneficiarios |
| **XLSX** | — | Exportación de datos a Excel |
| **date-fns** | — | Formateo y cálculo de fechas |
| **Vite PWA Plugin** | — | Progressive Web App (instalable en celular) |
| **@tanstack/react-virtual** | — | Renderizado virtual para listas largas |
| **React Hook Form** | — | Manejo de formularios |

### Infraestructura

| Componente | Descripción |
|-----------|-------------|
| **Supabase (PostgreSQL)** | Base de datos en la nube, backups automáticos |
| **Supabase Storage** | Almacenamiento de fotos de firma y documentos |
| **Gmail SMTP** | Envío de emails institucionales |
| **GitHub** | Control de versiones del código fuente |
| **PWA** | La app se puede instalar en el celular como una app nativa |

---

## 3. Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR / CELULAR                  │
│                                                         │
│   React + MUI + Zustand (frontend)                      │
│   PWA → instalable en Android / iOS / PC                │
└─────────────────────┬───────────────────────────────────┘
                      │  HTTPS + JWT
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   SERVIDOR BACKEND                      │
│                                                         │
│   NestJS (16 módulos)                                   │
│   ├── auth/          Autenticación JWT                  │
│   ├── beneficiarios/ CRUD + documentos + cruces         │
│   ├── remitos/       Ciclo entrega + PDF + email        │
│   ├── cronograma/    Planificación + generación masiva  │
│   ├── stock/         Inventario + ajustes + lotes       │
│   ├── casos/         Casos particulares + workflow      │
│   ├── reportes/      Analytics + ANEXO VI + dashboard   │
│   ├── eventos/       SSE tiempo real                    │
│   └── auditoria/     Log completo de actividad          │
└─────────────────────┬───────────────────────────────────┘
                      │  Prisma ORM
                      ▼
┌─────────────────────────────────────────────────────────┐
│              BASE DE DATOS (Supabase / PostgreSQL)      │
│                                                         │
│   ~20 tablas: beneficiarios, remitos, stock,            │
│   movimientos, casos, programas, usuarios, etc.         │
└─────────────────────────────────────────────────────────┘
```

### Flujo de datos en tiempo real

Cuando un depositero marca una entrega como realizada, todos los usuarios conectados lo ven instantáneamente:

```
Depositero confirma entrega
       ↓
Backend emite evento SSE "remito:entregado"
       ↓
Todos los navegadores conectados reciben el evento
       ↓
 · Se actualiza la campanita con la notificación de entrega
 · Las páginas que muestran ese remito lo actualizan automáticamente
```

---

## 4. Roles de usuario

El sistema tiene **6 roles** con accesos diferenciados:

| Rol | Descripción | Qué puede hacer |
|-----|-------------|-----------------|
| **ADMIN** | Administrador general | Todo sin restricciones |
| **OPERADOR_PROGRAMA** | Operador de la Secretaría | Beneficiarios, remitos, cronograma, casos, reportes |
| **LOGISTICA** | Personal de depósito | Stock, remitos de su depósito, transferencias, historial |
| **TRABAJADORA_SOCIAL** | Trabajadora social en campo | Sus propios casos, relevamiento de beneficiarios |
| **ASISTENCIA_CRITICA** | Personal de CITA | Igual que OPERADOR pero solo datos CITA |
| **VISOR** | Solo lectura | Dashboard, beneficiarios, reportes (sin modificar nada) |

### Permisos por acción

| Acción | ADMIN | OPERADOR | LOGISTICA | T. SOCIAL | ASIST. CRÍTICA | VISOR |
|--------|-------|----------|-----------|-----------|----------------|-------|
| Crear beneficiario | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Editar beneficiario | ✅ | ✅ | ❌ | Solo obs. | ✅ | ❌ |
| Eliminar beneficiario | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Crear/confirmar remito | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Marcar entrega física | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Ingreso de stock | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Transferir stock | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Ajuste de stock | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Crear caso | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Aprobar/rechazar caso | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver auditoría | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gestionar programas | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. Manual de usuario por rol

---

### 5.1 ADMINISTRADOR

El administrador tiene acceso completo al sistema. Su panel incluye todos los módulos.

**Tareas habituales:**

**Gestión de usuarios**
1. Ir a **Usuarios** en el menú lateral
2. Clic en **Nuevo usuario**
3. Completar nombre, email, contraseña y asignar rol
4. Para roles LOGISTICA: asignar el depósito correspondiente
5. Para roles OPERADOR_PROGRAMA: asignar el programa

**Gestión de programas**
1. Ir a **Programas**
2. Crear programa con nombre, tipo (REGULAR / PARTICULAR / DIARIO) y configuración
3. Activar/desactivar opciones: "usa cronograma", "usa plantilla", "descuenta stock automáticamente"
4. Configurar el **mensaje de WhatsApp** del programa (con variables `{nombre}`, `{fecha}`, `{hora}`, `{deposito}`, `{direccion}`)

**Ver auditoría**
1. Ir a **Auditoría**
2. Filtrar por usuario, fecha o acción
3. Atajos de período: Hoy / 7 días / 30 días / Este mes
4. Exportar a Excel para informes de control

---

### 5.2 OPERADOR DE PROGRAMA

Gestiona el día a día de la distribución alimentaria: beneficiarios, remitos y cronograma.

**Dar de alta un beneficiario**
1. Ir a **Beneficiarios → Nuevo beneficiario**
2. Completar: nombre, tipo (Espacio / Organización / Comedor / Caso particular), dirección, localidad, teléfono
3. Asignar programa y frecuencia de entrega (Mensual / Bimestral / Eventual)
4. Indicar kg habituales que recibe
5. Si es un espacio con múltiples personas: agregar integrantes en la pestaña "Integrantes"

> ⚠️ **Alerta de duplicado DNI**: Si al cargar el DNI del responsable ya existe en el sistema, aparece una advertencia. El sistema muestra a quién está vinculado ese DNI para evitar duplicaciones.

**Crear un remito manualmente**
1. Ir a **Remitos → Nuevo remito** (ícono +)
2. Seleccionar programa y beneficiario
3. Elegir una plantilla (carga los artículos predefinidos) o agregar artículos manualmente
4. Revisar cantidades y kg totales
5. Clic en **Guardar** (queda en BORRADOR)
6. Clic en **Confirmar** para descontar el stock y habilitar el envío

**Generar remitos masivos desde cronograma**
1. Ir a **Cronograma**
2. Seleccionar el rango de fechas
3. Ver el preview de cuántos remitos se van a generar y cuántos ya existen
4. Clic en **Generar remitos**
5. Cada beneficiario pendiente en ese período recibe su remito automáticamente

**Enviar remito al depósito**
1. En la lista de remitos, abrir uno CONFIRMADO
2. Clic en **Enviar email** para que el depositero lo reciba por correo
3. O clic en el ícono de **WhatsApp** para enviar un mensaje al beneficiario con la fecha y hora de retiro

**Buscar beneficiario por DNI**
- Usar la **Búsqueda por DNI** en el menú o presionar **Ctrl+K** desde cualquier pantalla
- Busca en beneficiarios, integrantes de espacios y casos particulares

---

### 5.3 LOGÍSTICA / DEPOSITERO

Gestiona la recepción de mercadería y confirma la entrega a beneficiarios.

**Pantalla principal del depósito**
Al ingresar al sistema, un usuario LOGISTICA con depósito asignado ve directamente el **panel de depósito** con:
- Número de remitos pendientes del día
- Lista de remitos por entregar (filtrable por nombre o número)
- Remitos ya entregados hoy

**Marcar un pedido como entregado**
1. En el panel, encontrar el remito del beneficiario
2. Clic en **Registrar entrega**
3. Escribir quién retiró (nombre y DNI — opcional)
4. Sacar foto de la firma (en celular usa la cámara directamente)
5. Clic en **Confirmar entrega**
6. El remito pasa a estado ENTREGADO y se notifica al personal de la Secretaría

**Registrar ingreso de mercadería**
1. Ir a **Stock → Ingresar mercadería**
2. Seleccionar artículo y cantidad recibida
3. Adjuntar el remito/factura del Ministerio (opcional)
4. Guardar — queda registrado en el historial de movimientos

**Registrar lote con vencimiento**
1. En **Artículos**, seleccionar el artículo
2. Pestaña **Lotes → Agregar lote**
3. Cargar cantidad, fecha de vencimiento y número de lote
4. El sistema alerta automáticamente cuando quedan ≤30 días para vencer

**Transferir stock entre depósitos**
1. Ir a **Stock → Transferir**
2. Seleccionar artículo, cantidad, depósito origen y depósito destino
3. Confirmar — queda registrado como movimiento TRANSFERENCIA

**Ajuste de inventario (reconciliación física)**
Si el conteo físico no coincide con el sistema:
1. Stock → botón **Ajustar stock**
2. Seleccionar artículo y depósito
3. Ingresar la **cantidad real** contada
4. Agregar observación (ej: "Conteo físico 15/03/2026")
5. El sistema registra la diferencia como movimiento AJUSTE

---

### 5.4 TRABAJADORA SOCIAL

Trabaja en campo, registra casos urgentes de familias que necesitan asistencia.

**Crear un caso particular**
1. Ir a **Mis Casos → Nuevo caso**
2. Completar datos de la persona: nombre, DNI, dirección, barrio, teléfono
3. Seleccionar tipo: Alimentario / Mercadería / Mixto
4. Seleccionar prioridad: Normal / Alta / Urgente
5. Describir la situación
6. Adjuntar documentación si hay (DNI, informe, foto)
7. Guardar → el caso queda en estado PENDIENTE para revisión

> ⚠️ Si el DNI ya está registrado en otro programa, aparece una **alerta de cruce** visible para que el revisor la tenga en cuenta.

**Seguir mis casos**
- En **Mis Casos** se ven solo los casos que creó esta trabajadora social
- Se puede filtrar por estado (pendiente, en revisión, aprobado, etc.)
- Al hacer clic en un caso se ven todos los detalles, notas del revisor y documentos

**Relevamiento de beneficiario**
- Al visitar un beneficiario en campo, puede actualizar las **observaciones** desde Beneficiarios
- Solo puede modificar el campo de observaciones, no los datos principales

---

### 5.5 ASISTENCIA CRÍTICA (CITA)

Opera exactamente igual que el OPERADOR_PROGRAMA, pero todos los datos que ve y crea pertenecen exclusivamente a la secretaría CITA. Los beneficiarios, remitos y stock de PA no son visibles.

---

### 5.6 VISOR

Solo puede consultar datos, no modificar nada:
- Ver dashboard con métricas generales
- Navegar la lista de beneficiarios
- Ver reportes y gráficos
- Buscar por DNI

---

## 6. Módulos y funciones

### 6.1 Dashboard

Panel principal con resumen operativo en tiempo real:

- **Tarjetas de estadísticas**: total beneficiarios activos, remitos del mes, kg entregados, casos pendientes
- **Alertas activas**: artículos con stock bajo, lotes próximos a vencer, casos urgentes sin atender
- **Gráfico de entregas**: evolución mensual de kg distribuidos (últimos 6 meses)
- **Próximas entregas**: cronograma de los próximos 7 días
- **Remitos recientes**: últimos movimientos del sistema
- Filtro por programa (pestaña)

---

### 6.2 Beneficiarios

Registro completo de todos los destinatarios de asistencia alimentaria.

**Tipos de beneficiario:**
- **ESPACIO**: Espacio comunitario con múltiples familias (tiene listado de integrantes)
- **ORGANIZACIÓN**: Organización civil o comunitaria
- **COMEDOR**: Comedor comunitario
- **CASO PARTICULAR**: Familia individual derivada de un caso

**Datos que se registran:**
- Nombre, tipo, dirección, localidad, teléfono
- Responsable: nombre y DNI
- Programa al que pertenece
- Frecuencia de entrega (Mensual / Bimestral / Eventual)
- Kg habituales que recibe
- Coordenadas GPS (para el mapa)
- Observaciones
- Integrantes (si es un espacio)
- Documentos adjuntos (DNI, informes, fotos)
- Motivo de baja al desactivar (Fallecido, Mudanza, Superó criterios, Solicitud propia, Otro)

**Funcionalidades:**
- Búsqueda server-side en tiempo real (nombre, responsable, DNI)
- Paginación (50 por página, configurable)
- Historial completo de entregas (pestaña dentro del beneficiario)
- Próxima entrega programada y última entrega real
- Detección automática de duplicado DNI al ingresar el responsable
- Cruce de programas: ver si el responsable aparece en otros programas o casos
- Exportar lista completa a Excel (con todos los filtros aplicados)
- Historial de cambios del beneficiario (ADMIN y OPERADOR)

---

### 6.3 Remitos

Documento que autoriza y registra la entrega de mercadería.

**Estados del ciclo de vida:**

```
BORRADOR → CONFIRMADO → ENVIADO → ENTREGADO
               ↓
         PENDIENTE_STOCK (si no hay stock suficiente)
```

**Acciones disponibles:**
| Acción | Descripción |
|--------|-------------|
| Crear | Definir beneficiario, artículos y cantidades |
| Confirmar | Descuenta el stock automáticamente |
| Descargar PDF | Genera el remito en formato PDF para imprimir |
| Enviar email | Manda el PDF al depósito por correo |
| WhatsApp | Abre wa.me con mensaje precargado para el beneficiario |
| Marcar entregado | El depositero confirma la entrega con foto opcional |
| Anular | Cancela el remito y devuelve el stock |

**Operaciones masivas:**
- Seleccionar varios remitos con checkbox
- Confirmar todos en un clic
- Exportar seleccionados a Excel

---

### 6.4 Cronograma

Planificador de entregas por semana/mes.

**Vista semanal:**
- Muestra qué beneficiarios corresponde atender cada día
- Indica si ya se generó el remito o está pendiente
- Permite ajustar fechas manualmente
- Botón para abrir el formulario completo de remito con datos precargados

**Generación masiva:**
1. Seleccionar rango de fechas
2. Ver preview: cuántas entregas pendientes hay, cuántas ya tienen remito
3. Generar todas las que faltan de una sola vez

---

### 6.5 Stock

Control completo del inventario en dos depósitos: **LOGISTICA** y **CITA**.

**Pestañas:**
- **Por depósito**: stock actual de cada artículo en cada depósito
- **Movimientos**: historial completo (ingresos, egresos, ajustes, transferencias)
- **Lotes / Vencimientos**: lotes registrados con código, cantidad y fecha de vencimiento (rojo = vencido, naranja = ≤30 días, verde = OK)

**Tipos de movimiento:**
| Tipo | Descripción |
|------|-------------|
| INGRESO | Mercadería recibida de la Provincia |
| EGRESO | Salida por remito confirmado (automático) |
| TRANSFERENCIA | Movimiento entre depósitos |
| AJUSTE | Corrección por conteo físico |

---

### 6.6 Casos Particulares

Workflow de atención a familias con necesidades urgentes que no están en los programas regulares.

**Flujo:**
1. **Trabajadora Social / CITA** crea el caso con datos de la persona y descripción
2. Si el DNI ya está en el sistema → aparece alerta de cruce prominente (chip naranja + banner)
3. **Operador** revisa el caso: puede pasar a EN_REVISION, pedir más información
4. **Operador** aprueba o rechaza con nota
5. Si se **aprueba**:
   - Generar remito directamente desde el caso
   - O convertir la persona en beneficiario regular del sistema

**Prioridades:**
- 🔴 **URGENTE**: Si lleva más de 24 hs sin atención, aparece la etiqueta "+24h" en rojo
- 🟠 **ALTA**
- ⚪ **NORMAL**
- 🔵 **BAJA**

**Documentos:** Se pueden adjuntar documentos escaneados al caso (DNI, certificados, informes)

---

### 6.7 Reportes

Módulo completo de analytics y exportación.

**Pestañas disponibles:**

| Pestaña | Contenido |
|---------|-----------|
| Distribución | Gráfico de barras: kg entregados por mes |
| Cronograma | Resumen de entregas del período: pendientes vs. realizadas |
| Beneficiarios | Cobertura por programa, distribución por localidad |
| Artículos | Top artículos más distribuidos en el período |
| Remitos | Detalle de todos los remitos del período |
| Stock | Situación actual del stock |
| Cruces DNI | Beneficiarios con DNI que aparece en múltiples programas |
| Sin Entrega | Beneficiarios que no recibieron en el tiempo esperado según su frecuencia |
| **Rendición** | Generador de ANEXO VI para presentar a la Provincia |

**Filtros disponibles:**
- Modo mes (mes + año) o rango de fechas personalizado
- Programa específico

**Rendición ANEXO VI:**
1. Seleccionar bimestre (Ene-Feb, Mar-Abr, etc.) + año + programa
2. Clic en **Consultar** → muestra quiénes retiraron en ese período
3. **Descargar ANEXO VI (.xlsx)** → genera el Excel con el formato oficial requerido por la Provincia:
   - Hoja 1: Apellido / Nombre / DNI / Grupo familiar / Dirección
   - Hoja 2: Ingresos de mercadería del período (si hay registrados)

---

### 6.8 Mapa

Mapa interactivo con la ubicación de todos los beneficiarios con GPS registrado.

**Funciones:**
- Ver beneficiarios como puntos en el mapa
- Clic en un punto: ver nombre, programa, frecuencia de entrega, dirección
- Contador de beneficiarios **sin coordenadas GPS**
- Exportar lista por localidad a Excel

---

### 6.9 Plantillas

Definen la composición estándar de cada entrega según el programa.

**Ejemplo:** Plantilla "Caja Alimentaria Familiar" → 2 kg arroz, 1 kg fideos, 2 lt aceite, etc.

Al crear un remito, se puede seleccionar una plantilla que pre-carga todos los artículos y cantidades base (modificables antes de confirmar).

---

### 6.10 Notificaciones (campanita 🔔)

El sistema tiene **dos tipos de notificaciones** accesibles desde el ícono de campana:

**Pestaña "Alertas"** — siempre presentes mientras la situación no se resuelva:
- Casos URGENTES o ALTA sin atender
- Casos aprobados sin remito generado
- Remitos con más de 7 días sin entregar
- Artículos con stock bajo el mínimo configurado

**Pestaña "Entregas"** — efímeras, desaparecen al leerlas:
- Cada vez que un depositero marca una entrega, aparece aquí: *"Depósito LOGISTICA entregó el pedido de: Familia González"*
- Fondo verde = no leída · Click = marca como leída y lleva al remito
- "Marcar todas como leídas" con un clic
- Se actualiza en tiempo real (sin necesidad de recargar la página)
- "Ver historial completo" → va al historial de entregas

---

### 6.11 Búsqueda global (Ctrl+K)

Presionar **Ctrl+K** desde cualquier pantalla abre el buscador global:
- Busca simultáneamente en: beneficiarios, casos y remitos
- Resultados agrupados por tipo
- Click en cualquier resultado navega directamente al registro

---

### 6.12 Auditoría

Registro completo de toda la actividad del sistema (solo ADMIN).

- Quién hizo qué y cuándo
- Atajos de período: Hoy / 7 días / 30 días / Este mes
- Filtro por usuario específico
- Exportar a Excel

---

## 7. Flujos de trabajo principales

### Flujo completo de distribución mensual

```
1. OPERADOR genera el cronograma del mes
         ↓
2. Sistema propone las entregas según frecuencia de cada beneficiario
         ↓
3. OPERADOR genera los remitos masivamente (o uno a uno)
         ↓
4. Stock se descuenta automáticamente al confirmar
         ↓
5. OPERADOR envía email al depósito (o depositero ve en su panel)
         ↓
6. OPERADOR envía WhatsApp al beneficiario avisando fecha y hora
         ↓
7. Beneficiario se presenta al depósito
         ↓
8. DEPOSITERO marca la entrega con foto de firma
         ↓
9. Notificación en tiempo real llega a la Secretaría
         ↓
10. Al final del bimestre: generar ANEXO VI para la rendición a la Provincia
```

### Flujo de caso particular urgente

```
1. TRABAJADORA SOCIAL crea el caso en campo (puede desde el celular)
         ↓
2. Sistema detecta si el DNI ya está en algún programa → alerta de cruce
         ↓
3. OPERADOR recibe alerta "caso urgente sin atender"
         ↓
4. OPERADOR revisa el caso → aprueba con nota
         ↓
5. Sistema genera automáticamente el remito desde el caso aprobado
         ↓
6. DEPOSITERO entrega la mercadería
         ↓
7. Si corresponde: OPERADOR registra a la familia como beneficiario regular
```

### Flujo de ingreso de mercadería

```
1. Provincia entrega mercadería al depósito
         ↓
2. DEPOSITERO carga el ingreso en Stock con la cantidad recibida
3. Adjunta el remito de control interno del Ministerio (foto/PDF)
         ↓
4. Stock se actualiza automáticamente
         ↓
5. Si se registran lotes: cargar número de lote y fecha de vencimiento
         ↓
6. Al final del bimestre: el ingreso aparece en la hoja "Ingresos" del ANEXO VI
```

---

## 8. Integraciones

### WhatsApp (implementado — manual)

Actualmente el sistema genera un **link de WhatsApp** con el mensaje ya armado. El operador hace clic, se abre WhatsApp Web o el celular, y envía el mensaje con un toque.

**Mensaje configurable por programa** con variables:
- `{nombre}` → Nombre del beneficiario
- `{fecha}` → Fecha de entrega programada
- `{hora}` → Hora de entrega
- `{deposito}` → Nombre del depósito
- `{direccion}` → Dirección del depósito
- `{numero}` → Número del remito

**Próximo paso:** Integración con Twilio / Meta Business API para envío automático sin intervención manual.

### Email

El sistema puede enviar el PDF del remito por email directamente al depositero:
- Configurado con servidor SMTP (Gmail institucional)
- El remito llega como adjunto PDF

### Exportación Excel

Desde casi cualquier tabla del sistema se puede exportar a Excel:
- Lista de beneficiarios (con filtros aplicados)
- Historial de entregas
- Remitos del período
- ANEXO VI completo para rendición
- Auditoría
- Lista por localidad del mapa

### PDF

El sistema genera PDFs de:
- **Remitos individuales** (para imprimir y entregar)
- **Historial de entregas filtrado** (para presentar a autoridades)

---

## 9. Glosario

| Término | Significado |
|---------|-------------|
| **Beneficiario** | Familia, espacio, comedor u organización que recibe asistencia alimentaria |
| **Remito** | Documento que registra y autoriza una entrega de mercadería |
| **Plantilla** | Composición estándar de artículos y cantidades para un programa |
| **Cronograma** | Planificación de cuándo corresponde entregar a cada beneficiario |
| **Stock** | Inventario de mercadería disponible en cada depósito |
| **Lote** | Conjunto de mercadería identificada por número de lote y fecha de vencimiento |
| **Movimiento** | Registro de cualquier cambio en el stock (ingreso, egreso, ajuste, transferencia) |
| **Caso particular** | Solicitud de asistencia urgente de una familia no incluida en programas regulares |
| **Tarea** | Acción pendiente asignada a un usuario del sistema |
| **Secretaría** | Departamento de gobierno (PA = Política Alimentaria, CITA = Asistencia Crítica) |
| **ANEXO VI** | Documento oficial requerido por la Provincia para la rendición bimestral |
| **Rendición** | Presentación formal ante la Provincia de las entregas realizadas en el período |
| **Cruce de DNI** | Alerta cuando el DNI de un solicitante ya aparece en otro programa o caso |
| **Ajuste de stock** | Corrección del inventario del sistema para que coincida con el conteo físico real |
| **Integrante** | Persona que forma parte de un espacio comunitario o comedor |
| **Relevamiento** | Actualización de observaciones de un beneficiario por parte de una trabajadora social |
| **SSE** | Server-Sent Events — tecnología para actualizaciones en tiempo real sin recargar la página |
| **PWA** | Progressive Web App — la app puede instalarse en el celular como si fuera nativa |

---

*Documentación generada: 22/03/2026 · SIGAM v1.0*
*Municipalidad de La Plata — Secretaría de Desarrollo Social*
