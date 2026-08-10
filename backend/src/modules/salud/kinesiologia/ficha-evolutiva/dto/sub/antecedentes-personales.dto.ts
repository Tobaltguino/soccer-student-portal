import { IsOptional, IsString } from 'class-validator';

export class AntecedentesPersonalesDto {
  @IsOptional() @IsString() mecanismoLesion?: string;
  @IsOptional() @IsString() tiempoEvolucion?: string;
  @IsOptional() @IsString() tratamientosRecibidos?: string;
  @IsOptional() @IsString() examenesComplementarios?: string;
  @IsOptional() @IsString() sintomasActuales?: string;
  @IsOptional() @IsString() dolor?: string;
}