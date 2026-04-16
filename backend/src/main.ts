import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first'); // Render free no tiene salida IPv6

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  // Validar variables de entorno críticas en producción
  const isProd = process.env.NODE_ENV === 'production';
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
  if (isProd) requiredEnvVars.push('FRONTEND_URL');

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(
        `Variable de entorno requerida no configurada: ${envVar}`,
      );
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Servir archivos estáticos (fotos de remitos)
  mkdirSync(join(process.cwd(), 'uploads', 'remitos'), { recursive: true });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // CORS: en producción sólo permite el/los dominio(s) del frontend.
  // Se pueden definir múltiples orígenes separados por coma en FRONTEND_URL (p.ej. staging + prod).
  const allowedOrigins = isProd
    ? (process.env.FRONTEND_URL ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:5174'];
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / health-checks sin Origin
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origen no permitido (${origin})`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Prefijo global API (excepto /health para que Render pueda verificar)
  app.setGlobalPrefix('api', { exclude: ['health'] });

  // Health check para Render y monitoreo
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('SIGAM API')
    .setDescription('Sistema Integral de Gestión Alimentaria Municipal')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticación y usuarios')
    .addTag('programas', 'Programas de asistencia')
    .addTag('beneficiarios', 'Comedores y organizaciones')
    .addTag('articulos', 'Artículos e inventario')
    .addTag('stock', 'Control de stock')
    .addTag('plantillas', 'Plantillas de entrega')
    .addTag('cronograma', 'Cronograma automático')
    .addTag('remitos', 'Remitos y entregas')
    .addTag('reportes', 'Reportes e informes')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;

  // Health check para UptimeRobot (fuera del prefijo /api)
  app.getHttpAdapter().get('/health', (_req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  await app.listen(port);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀  SIGAM Backend iniciado correctamente                  ║
║                                                              ║
║   📡  API:     http://localhost:${port}/api                    ║
║   📚  Docs:    http://localhost:${port}/api/docs               ║
║   🗄️   DB:      ${process.env.DATABASE_URL?.split('@')[1] || 'PostgreSQL'}
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
