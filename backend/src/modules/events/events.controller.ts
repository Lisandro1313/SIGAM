import { Controller, Get, Req, Res, Sse, Query, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly jwtService: JwtService,
  ) {}

  @Sse('stream')
  @ApiOperation({ summary: 'SSE stream de eventos en tiempo real' })
  stream(@Query('token') token: string): Observable<MessageEvent> {
    // SSE no soporta headers personalizados; validamos el token por query param
    if (!token) throw new UnauthorizedException('Token requerido');
    try {
      this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
    return this.eventsService.subscribe();
  }
}
