import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS para desarrollo
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Prefijo global API
  app.setGlobalPrefix('api');

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
