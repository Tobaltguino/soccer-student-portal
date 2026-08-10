import { IsBoolean, IsOptional } from 'class-validator';

export class NoEvaluableDto {
  @IsOptional() @IsBoolean() rom?: boolean;
  @IsOptional() @IsBoolean() fuerza?: boolean;
  @IsOptional() @IsBoolean() balance?: boolean;
}