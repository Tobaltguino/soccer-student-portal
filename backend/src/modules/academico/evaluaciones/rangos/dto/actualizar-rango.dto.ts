import { PartialType } from '@nestjs/mapped-types';
import { CrearRangoDto } from './crear-rango.dto';

export class ActualizarRangoDto extends PartialType(CrearRangoDto) {}