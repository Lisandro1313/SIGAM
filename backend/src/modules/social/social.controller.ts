import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialService } from './social.service';

@ApiTags('social')
@Controller('social')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@SkipThrottle()
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get()
  listar() {
    return this.socialService.listar();
  }

  @Get('proximos')
  proximos(@Query('dias') dias?: string) {
    return this.socialService.proximos(dias ? parseInt(dias) : 30);
  }

  @Post()
  crear(@Body() body: any, @Request() req) {
    return this.socialService.crear(body, req.user);
  }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.socialService.actualizar(id, body);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.socialService.eliminar(id);
  }
}
