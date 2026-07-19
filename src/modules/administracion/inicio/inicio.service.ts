import { Injectable } from '@nestjs/common';
import { CreateInicioDto } from './dto/create-inicio.dto';
import { UpdateInicioDto } from './dto/update-inicio.dto';

@Injectable()
export class InicioService {
  create(createInicioDto: CreateInicioDto) {
    return 'This action adds a new inicio';
  }

  findAll() {
    return `This action returns all inicio`;
  }

  findOne(id: number) {
    return `This action returns a #${id} inicio`;
  }

  update(id: number, updateInicioDto: UpdateInicioDto) {
    return `This action updates a #${id} inicio`;
  }

  remove(id: number) {
    return `This action removes a #${id} inicio`;
  }
}
