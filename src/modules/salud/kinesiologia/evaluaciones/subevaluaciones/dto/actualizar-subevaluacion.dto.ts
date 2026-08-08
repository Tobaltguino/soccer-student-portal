import { PartialType } from '@nestjs/mapped-types';
import { CrearSubevaluacionDto } from './crear-subevaluacion.dto';

export class ActualizarSubevaluacionDto extends PartialType(CrearSubevaluacionDto) {}