import { Test, TestingModule } from '@nestjs/testing';
import { CentralService } from './central.service';

describe('CentralService', () => {
  let service: CentralService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CentralService],
    }).compile();

    service = module.get<CentralService>(CentralService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
