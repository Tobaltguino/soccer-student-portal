import { IsOptional, IsString } from 'class-validator';

export class AntecedentesRemotosDto {
  @IsOptional() @IsString() antecedentesSecundarios?: string;
  @IsOptional() @IsString() antecedentesQuirurgicos?: string;
  @IsOptional() @IsString() habitos?: string;
  @IsOptional() @IsString() medicamentos?: string;
}