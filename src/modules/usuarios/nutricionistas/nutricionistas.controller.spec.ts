import { Test, TestingModule } from '@nestjs/testing';
import { NutricionistasController } from './nutricionistas.controller';

describe('NutricionistasController', () => {
  let controller: NutricionistasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NutricionistasController],
    }).compile();

    controller = module.get<NutricionistasController>(NutricionistasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
