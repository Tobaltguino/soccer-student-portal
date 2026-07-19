import { Injectable } from '@nestjs/common';
import { CreateNutriDto } from './dto/create-nutri.dto';
import { UpdateNutriDto } from './dto/update-nutri.dto';

@Injectable()
export class NutriService {
  create(createNutriDto: CreateNutriDto) {
    return 'This action adds a new nutri';
  }

  findAll() {
    return `This action returns all nutri`;
  }

  findOne(id: number) {
    return `This action returns a #${id} nutri`;
  }

  update(id: number, updateNutriDto: UpdateNutriDto) {
    return `This action updates a #${id} nutri`;
  }

  remove(id: number) {
    return `This action removes a #${id} nutri`;
  }
}
