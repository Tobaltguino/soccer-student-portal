import { Module } from '@nestjs/common';
import { CentralController } from './central.controller';
import { CentralService } from './central.service';
import { EstudiantesModule } from '../estudiantes/estudiantes.module';
import { ProfesoresModule } from '../profesores/profesores.module';
import { KinesiologosModule } from '../kinesiologos/kinesiologos.module';
import { NutricionistasModule } from '../nutricionistas/nutricionistas.module';
import { AdminsModule } from '../admins/admins.module';

@Module({
  imports: [
    EstudiantesModule,
    ProfesoresModule,
    KinesiologosModule,
    NutricionistasModule,
    AdminsModule,
  ],
  controllers: [CentralController],
  providers: [CentralService],
})
export class CentralModule {}