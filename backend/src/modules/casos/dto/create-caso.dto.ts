import { IsNotEmpty, IsOptional, IsString, IsEnum, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCasoDto {
  @IsNotEmpty() @IsString()
  nombreSolicitante: string;

  @IsOptional() @IsString()
  dni?: string;

  @IsOptional() @IsString()
  direccion?: string;

  @IsOptional() @IsString()
  barrio?: string;

  @IsOptional() @IsString()
  telefono?: string;

  @IsNotEmpty() @IsString()
  descripcion: string;

  @IsOptional() @IsEnum(['NORMAL', 'ALTA', 'URGENTE'])
  prioridad?: string;

  @IsNotEmpty() @IsEnum(['ALIMENTARIO', 'MERCADERIA', 'MIXTO'])
  tipo: string;

  @IsOptional() @IsInt() @IsPositive() @Type(() => Number)
  beneficiarioId?: number;
}
