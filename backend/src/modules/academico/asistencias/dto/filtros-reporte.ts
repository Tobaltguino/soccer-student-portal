import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class FiltrosReporteMensualDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  grupoId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  anio!: number;
}