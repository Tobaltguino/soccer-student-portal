import { PartialType } from '@nestjs/mapped-types';
import { CrearClaseDto } from './crear-clase.dto';

export class ActualizarClaseDto extends PartialType(CrearClaseDto) {}