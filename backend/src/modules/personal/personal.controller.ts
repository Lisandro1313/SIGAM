import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PersonalService } from './personal.service';
import { CreatePersonalDto } from './dto/create-personal.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PushService } from '../../shared/push/push.service';

@ApiTags('personal')
@Controller('personal')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PersonalController {
  constructor(
    private readonly personalService: PersonalService,
    private readonly pushService: PushService,
  ) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crear personal' })
  create(@Body() dto: CreatePersonalDto) {
    return this.personalService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar personal' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.personalService.findAll(includeInactive === 'true');
  }

  @Get('push/vapid-key')
  @ApiOperation({ summary: 'Obtener VAPID public key para push notifications' })
  getVapidKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener personal por ID' })
  findOne(@Param('id') id: string) {
    return this.personalService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar personal' })
  update(@Param('id') id: string, @Body() dto: UpdatePersonalDto) {
    return this.personalService.update(+id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar personal' })
  remove(@Param('id') id: string) {
    return this.personalService.remove(+id);
  }

  @Post(':id/push-subscription')
  @ApiOperation({ summary: 'Guardar suscripción push de personal' })
  savePushSubscription(@Param('id') id: string, @Body('subscription') subscription: string) {
    return this.personalService.savePushSubscription(+id, subscription);
  }

  @Post(':id/test-push')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Enviar push de prueba a un personal' })
  async testPush(@Param('id') id: string) {
    const personal = await this.personalService.findOne(+id);
    if (!personal.pushSubscription) {
      return { ok: false, message: 'Esta persona no tiene notificaciones activadas' };
    }
    const result = await this.pushService.send(personal.pushSubscription, {
      title: 'Prueba SIGAM',
      body: `Hola ${personal.nombre}, las notificaciones funcionan correctamente!`,
      url: '/tareas',
    });
    if (result?.expired) {
      await this.personalService.savePushSubscription(+id, '');
      return { ok: false, message: 'La suscripción expiró, hay que activar de nuevo' };
    }
    return { ok: true, message: 'Push enviado correctamente' };
  }
}
