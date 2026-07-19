import { Test, TestingModule } from '@nestjs/testing';
import { EvaluacionFisicaService } from './evaluacion-fisica.service';

describe('EvaluacionFisicaService', () => {
  let service: EvaluacionFisicaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvaluacionFisicaService],
    }).compile();

    service = module.get<EvaluacionFisicaService>(EvaluacionFisicaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
