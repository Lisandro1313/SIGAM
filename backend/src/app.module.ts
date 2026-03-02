import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

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
  ],
})
export class AppModule {}
