# Configuración de Email (Gmail)

El sistema envía remitos por email automáticamente. Aquí está cómo configurar Gmail:

## 📧 Opción 1: Gmail con App Password (Recomendado)

### 1. Habilitar verificación en 2 pasos
1. Ir a https://myaccount.google.com/security
2. Buscar "Verificación en 2 pasos"
3. Activarla

### 2. Generar App Password
1. Ir a https://myaccount.google.com/apppasswords
2. Seleccionar "Correo" y "Otro (nombre personalizado)"
3. Escribir: "SIGAM Municipalidad"
4. Clic en "Generar"
5. **COPIAR la contraseña de 16 dígitos** (sin espacios)

### 3. Configurar en .env

Editar `backend/.env`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="tu-email@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"  # La contraseña generada (sin espacios)

DEPOSITO_EMAIL_LOGISTICA="logistica@municipalidad.gob.ar"
DEPOSITO_EMAIL_CITA="cita@municipalidad.gob.ar"
```

### 4. Probar
```bash
cd backend
npm run start:dev
```

Crear un remito, confirmarlo y enviarlo por email. Deberías recibir el PDF.

## 📧 Opción 2: Gmail con "Acceso de apps menos seguras" (No recomendado)

⚠️ Google está deshabilitando esta opción progresivamente.

1. Ir a https://myaccount.google.com/lesssecureapps
2. Activar "Permitir aplicaciones menos seguras"
3. Configurar en .env:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="tu-email@gmail.com"
SMTP_PASS="tu-contraseña-normal"
```

## 📧 Opción 3: Otro proveedor SMTP

### Outlook/Hotmail
```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT=587
SMTP_USER="tu-email@outlook.com"
SMTP_PASS="tu-contraseña"
```

### Yahoo
```env
SMTP_HOST="smtp.mail.yahoo.com"
SMTP_PORT=587
SMTP_USER="tu-email@yahoo.com"
SMTP_PASS="tu-app-password"
```

### SMTP Servidor propio
```env
SMTP_HOST="smtp.tudominio.com"
SMTP_PORT=587
SMTP_USER="tu-usuario"
SMTP_PASS="tu-contraseña"
```

## 🧪 Probar configuración

### Test con curl

```bash
curl -X POST http://localhost:3000/api/remitos/1/enviar \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -H "Content-Type: application/json"
```

### Test en Swagger

1. Ir a http://localhost:3000/api/docs
2. Hacer login para obtener token
3. Clic en "Authorize" y pegar token
4. Buscar endpoint `POST /remitos/{id}/enviar`
5. Probar con un remito CONFIRMADO

## ❓ Solución de Problemas

### Error: "Invalid login"
- ✅ Verificar que SMTP_USER tiene el email correcto
- ✅ Verificar que SMTP_PASS es la contraseña de aplicación (16 dígitos)
- ✅ Verificar que la verificación en 2 pasos está activa

### Error: "Connection timeout"
- ✅ Verificar que SMTP_PORT es 587 (no 465)
- ✅ Verificar firewall/antivirus
- ✅ Probar con otro proveedor

### Email se envía pero no llega
- ✅ Revisar carpeta SPAM
- ✅ Verificar DEPOSITO_EMAIL_LOGISTICA y DEPOSITO_EMAIL_CITA
- ✅ Verificar que el dominio no está bloqueado

### Error: "self signed certificate"
Si usas un servidor SMTP propio con certificado autofirmado, modificar `backend/src/modules/remitos/services/email.service.ts`:

```typescript
this.transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false  // ⚠️ Solo para desarrollo
  }
});
```

## 📝 Template del Email

El email incluye:
- ✉️ Asunto: "Remito PA XXXXXX - [Nombre Beneficiario]"
- 📄 Adjunto: PDF del remito con logo municipal
- 📝 Cuerpo: Información del remito y beneficiario

Para personalizar, editar:
`backend/src/modules/remitos/services/email.service.ts` → método `enviarRemito()`

## 🔒 Seguridad

- ⚠️ **NUNCA** subir .env a repositorios públicos
- ✅ Usar app passwords en vez de contraseña real
- ✅ Mantener SMTP_PASS como variable de entorno
- ✅ En producción, usar servicios como SendGrid, AWS SES, Mailgun
