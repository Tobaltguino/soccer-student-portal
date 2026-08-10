import { IsBoolean, IsUUID } from 'class-validator';

export class MarcarAsistenciaDto {
  @IsUUID()
  estudianteId!: string;

  @IsBoolean()
  presente!: boolean;
}