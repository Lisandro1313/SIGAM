import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @ApiProperty()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: ['ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'VISOR'] })
  @IsEnum(['ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'VISOR'])
  rol: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  programaId?: number;
}
