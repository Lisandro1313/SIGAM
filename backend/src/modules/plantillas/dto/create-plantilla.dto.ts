import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PlantillaItemDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  articuloId: number;

  @ApiProperty()
  @IsNotEmpty()
  cantidadBase: number;
}

export class CreatePlantillaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  programaId: number;

  @ApiProperty({ type: [PlantillaItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlantillaItemDto)
  items: PlantillaItemDto[];
}
