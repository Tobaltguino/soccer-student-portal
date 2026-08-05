import { PartialType } from '@nestjs/mapped-types';
import { CrearTipoEvaluacionDto } from './crear-tipo-evaluacion.dto';

export class ActualizarTipoEvaluacionDto extends PartialType(CrearTipoEvaluacionDto) {}