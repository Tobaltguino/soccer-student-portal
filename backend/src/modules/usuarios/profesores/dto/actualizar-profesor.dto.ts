import { IsIn, IsOptional } from 'class-validator';

export class ActualizarProfesorDto {
  @IsOptional()
  @IsIn(['preparador fisico', 'profesor de futbol'])
  tipoProfesor?: string;
}