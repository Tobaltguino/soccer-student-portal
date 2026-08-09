import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, Min, IsInt } from 'class-validator';

export class FiltrarSesionesDto {
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  incluirEliminadas?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  limite?: number;
}