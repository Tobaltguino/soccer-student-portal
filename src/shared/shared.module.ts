import { Global, Module } from '@nestjs/common';
import { AlcanceGruposService } from './services/alcance-grupos.service';

@Global()
@Module({
  providers: [AlcanceGruposService],
  exports: [AlcanceGruposService],
})
export class SharedModule {}