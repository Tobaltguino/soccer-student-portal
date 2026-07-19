import { PartialType } from '@nestjs/mapped-types';
import { CreateNutriDto } from './create-nutri.dto';

export class UpdateNutriDto extends PartialType(CreateNutriDto) {}
