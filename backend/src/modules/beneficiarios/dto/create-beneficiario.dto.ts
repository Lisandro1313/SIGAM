import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBeneficiarioDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tipo: string; // ESPACIO, ORGANIZACION, CASO_PARTICULAR, COMEDOR

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  localidad?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  responsableNombre?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  responsableDNI?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  frecuenciaEntrega?: string; // MENSUAL, BIMESTRAL, EVENTUAL

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  programaId?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  kilosHabitual?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
