import { IsBoolean, IsOptional } from 'class-validator';

export class CoordinacionDto {
  @IsOptional() @IsBoolean() dedoNariz?: boolean;
  @IsOptional() @IsBoolean() pinzaPulgarIndice?: boolean;
  @IsOptional() @IsBoolean() talonRodilla?: boolean;
}