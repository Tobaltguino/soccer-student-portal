import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class InspeccionDinamicaDto {
  @IsOptional() @IsString() disfuncion?: string;
  @IsOptional() @IsString() gruposMusc?: string;
  @IsOptional() @IsBoolean() sinCompensacion?: boolean;
  @IsOptional() @IsBoolean() conCompensacion?: boolean;
  @IsOptional() @IsBoolean() noLograMov?: boolean;
}