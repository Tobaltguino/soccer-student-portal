import { PartialType } from '@nestjs/mapped-types';
import { CreateEvaluacionFisicaDto } from './create-evaluacion-fisica.dto';

export class UpdateEvaluacionFisicaDto extends PartialType(CreateEvaluacionFisicaDto) {}
