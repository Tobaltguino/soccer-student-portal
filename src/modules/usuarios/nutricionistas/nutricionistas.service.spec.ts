import { Test, TestingModule } from '@nestjs/testing';
import { NutricionistasService } from './nutricionistas.service';

describe('NutricionistasService', () => {
  let service: NutricionistasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NutricionistasService],
    }).compile();

    service = module.get<NutricionistasService>(NutricionistasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
