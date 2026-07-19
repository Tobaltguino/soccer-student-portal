import { Test, TestingModule } from '@nestjs/testing';
import { NutriService } from './nutri.service';

describe('NutriService', () => {
  let service: NutriService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NutriService],
    }).compile();

    service = module.get<NutriService>(NutriService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
