import { IsOptional, IsString } from 'class-validator';

export class PosturaDto {
  @IsOptional() @IsString() actitud?: string;
  @IsOptional() @IsString() eess?: string;
  @IsOptional() @IsString() eeii?: string;
}