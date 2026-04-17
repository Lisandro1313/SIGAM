import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { ProgramasModule } from './modules/programas/programas.module';
import { BeneficiariosModule } from './modules/beneficiarios/beneficiarios.module';
import { ArticulosModule } from './modules/articulos/articulos.module';
import { StockModule } from './modules/stock/stock.module';
import { PlantillasModule } from './modules/plantillas/plantillas.module';
import { CronogramaModule } from './modules/cronograma/cronograma.module';
import { RemitosModule } from './modules/remitos/remitos.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { DepositosModule } from './modules/depositos/depositos.module';
import { ZonasModule } from './modules/zonas/zonas.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { AuditoriaInterceptor } from './modules/auditoria/auditoria.interceptor';
import { TareasModule } from './modules/tareas/tareas.module';
import { CasosModule } from './modules/casos/casos.module';
import { EventsModule } from './modules/events/events.module';
import { BackupModule } from './modules/backup/backup.module';
import { NoticiasModule } from './modules/noticias/noticias.module';
import { NutricionistaModule } from './modules/nutricionista/nutricionista.module';
import { PersonalModule } from './modules/personal/personal.module';
import { PushModule } from './shared/push/push.module';
import { SugerenciasModule } from './modules/sugerencias/sugerencias.module';
import { DocumentosModule } from './modules/documentos/documentos.module';

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Tareas programadas (backup semanal, etc.)
    ScheduleModule.forRoot(),

    // Rate limiting global: 300 req/min general; ventanas más estrictas para login.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 300 },
      { name: 'login-min', ttl: 60_000, limit: 5 },
      { name: 'login-hour', ttl: 60 * 60_000, limit: 30 },
    ]),

    // Base de datos
    PrismaModule,

    // Módulos de negocio
    AuthModule,
    UsuariosModule,
    ProgramasModule,
    BeneficiariosModule,
    ArticulosModule,
    StockModule,
    DepositosModule,
    PlantillasModule,
    CronogramaModule,
    RemitosModule,
    ReportesModule,
    ZonasModule,
    AuditoriaModule,
    TareasModule,
    CasosModule,
    EventsModule,
    BackupModule,
    NoticiasModule,
    NutricionistaModule,
    PersonalModule,
    PushModule,
    SugerenciasModule,
    DocumentosModule,
  ],
  providers: [
    // Aplicar rate limiting globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Interceptor global de auditoría
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditoriaInterceptor,
    },
  ],
})
export class AppModule {}
