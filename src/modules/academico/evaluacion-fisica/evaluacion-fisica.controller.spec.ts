import { Test, TestingModule } from '@nestjs/testing';
import { EvaluacionFisicaController } from './evaluacion-fisica.controller';
import { EvaluacionFisicaService } from './evaluacion-fisica.service';

describe('EvaluacionFisicaController', () => {
  let controller: EvaluacionFisicaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvaluacionFisicaController],
      providers: [EvaluacionFisicaService],
    }).compile();

    controller = module.get<EvaluacionFisicaController>(EvaluacionFisicaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
