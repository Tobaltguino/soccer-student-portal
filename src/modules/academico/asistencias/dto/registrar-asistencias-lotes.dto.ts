import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { MarcarAsistenciaDto } from './marcar-asistencia.dto';

export class RegistrarAsistenciasLoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarcarAsistenciaDto)
  asistencias!: MarcarAsistenciaDto[];
}