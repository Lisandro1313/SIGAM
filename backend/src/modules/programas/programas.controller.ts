import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProgramasService } from './programas.service';
import { CreateProgramaDto } from './dto/create-programa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('programas')
@Controller('programas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProgramasController {
  constructor(private readonly programasService: ProgramasService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crear programa' })
  create(@Body() createProgramaDto: CreateProgramaDto) {
    return this.programasService.create(createProgramaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar programas' })
  findAll() {
    return this.programasService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener programa por ID' })
  findOne(@Param('id') id: string) {
    return this.programasService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar programa' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.programasService.update(+id, updateData);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar programa' })
  remove(@Param('id') id: string) {
    return this.programasService.remove(+id);
  }
}
