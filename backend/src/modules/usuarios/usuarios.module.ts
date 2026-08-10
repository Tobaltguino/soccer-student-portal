import { Module } from '@nestjs/common';
import { CentralModule } from './central/central.module';
import { EstudiantesModule } from './estudiantes/estudiantes.module';
import { ProfesoresModule } from './profesores/profesores.module';
import { KinesiologosModule } from './kinesiologos/kinesiologos.module';
import { NutricionistasModule } from './nutricionistas/nutricionistas.module';
import { AdminsModule } from './admins/admins.module';
import { AceptacionesLegalesModule } from './aceptaciones-legales/aceptaciones-legales.module';

@Module({
  imports: [
    CentralModule,
    EstudiantesModule,
    ProfesoresModule,
    KinesiologosModule,
    NutricionistasModule,
    AdminsModule,
    AceptacionesLegalesModule,
  ],
})
export class UsuariosModule {}