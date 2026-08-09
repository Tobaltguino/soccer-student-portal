import { Global, Module } from '@nestjs/common';
import { AuditoriaService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

@Global()
@Module({
  providers: [AuditoriaService, AuditInterceptor],
  exports: [AuditoriaService],
})
export class AuditModule {}