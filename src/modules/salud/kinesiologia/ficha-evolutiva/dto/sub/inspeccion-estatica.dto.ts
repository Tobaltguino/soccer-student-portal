import { IsOptional, IsString } from 'class-validator';

export class InspeccionEstaticaDto {
  @IsOptional() @IsString() anterior?: string;
  @IsOptional() @IsString() posterior?: string;
  @IsOptional() @IsString() sagitalDer?: string;
  @IsOptional() @IsString() sagitalIzq?: string;
}