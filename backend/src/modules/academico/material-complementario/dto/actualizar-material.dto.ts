import { PartialType } from '@nestjs/mapped-types';
import { CrearMaterialDto } from './crear-material.dto';

export class ActualizarMaterialDto extends PartialType(CrearMaterialDto) {}