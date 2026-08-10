import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearHistorialDto {
  @IsUUID()
  estudianteId!: string;

  @IsIn(['ALERGIA', 'PATOLOGIA', 'LESION'])
  tipo!: 'ALERGIA' | 'PATOLOGIA' | 'LESION';

  @IsOptional()
  @IsString()
  diagnostico?: string;

  @IsDateString()
  fechaEvento!: string;

  @IsOptional()
  @IsIn(['EN_OBSERVACION', 'EN_TRATAMIENTO', 'EN_REINTEGRO_DEPORTIVO', 'RECUPERADO'])
  estado?: 'EN_OBSERVACION' | 'EN_TRATAMIENTO' | 'EN_REINTEGRO_DEPORTIVO' | 'RECUPERADO';

  @IsOptional()
  @IsString()
  observaciones?: string;
}