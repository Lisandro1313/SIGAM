import { Controller, Get, Post, Sse, Query, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { randomBytes } from 'crypto';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

function getSecretaria(rol: string): string | null {
  if (rol === 'ASISTENCIA_CRITICA') return 'AC';
  if (rol === 'LOGISTICA' || rol === 'VISOR') return null;
  return 'PA';
}

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Paso 1: el frontend autentica con Bearer y obtiene un ticket efímero (30s).
   * Así el JWT nunca aparece en la URL de EventSource.
   */
  @Post('ticket')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener ticket efímero para abrir SSE' })
  crearTicket(@Request() req): { ticket: string } {
    const secretaria = getSecretaria(req.user.rol);
    const ticket = this.eventsService.crearTicket(req.user.id, secretaria);
    return { ticket };
  }

  /**
   * Paso 2: el frontend abre EventSource con el ticket de un solo uso.
   */
  @Sse('stream')
  @SkipThrottle()
  @ApiOperation({ summary: 'SSE stream de eventos en tiempo real (ticket efímero)' })
  stream(@Query('ticket') ticket: string): Observable<MessageEvent> {
    if (!ticket) throw new UnauthorizedException('Ticket requerido');
    const sesion = this.eventsService.consumirTicket(ticket);
    if (!sesion) throw new UnauthorizedException('Ticket inválido o expirado');

    const clientId = randomBytes(8).toString('hex');
    return this.eventsService.subscribe(clientId, sesion.secretaria);
  }
}
