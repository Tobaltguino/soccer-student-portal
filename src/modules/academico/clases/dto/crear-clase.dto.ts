import { IsDateString, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearClaseDto {
  @IsInt()
  grupoId!: number;

  @IsOptional()
  @IsUUID()
  profesorId?: string;

  @IsDateString()
  fecha!: string;

  @IsString()
  hora!: string;

  @IsOptional()
  @IsString()
  lugar?: string;

  @IsOptional()
  @IsString()
  objetivo?: string;

  @IsOptional()
  @IsString()
  calentamiento?: string;

  @IsOptional()
  @IsString()
  partePrincipal?: string;

  @IsOptional()
  @IsString()
  vueltaCalma?: string;
}