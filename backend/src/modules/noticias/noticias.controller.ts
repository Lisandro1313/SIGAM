import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NoticiasService } from './noticias.service';

@Controller('noticias')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class NoticiasController {
  constructor(private readonly noticiasService: NoticiasService) {}

  @Get()
  async getNoticias(): Promise<object[]> {
    return this.noticiasService.getNoticias();
  }
}
