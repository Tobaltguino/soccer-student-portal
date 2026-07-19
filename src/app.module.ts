import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GruposModule } from './modules/grupos/grupos.module';
import { AsistenciaModule } from './modules/academico/asistencia/asistencia.module';
import { ClasesModule } from './modules/academico/clases/clases.module';
import { EvaluacionFisicaModule } from './modules/academico/evaluacion-fisica/evaluacion-fisica.module';
import { GruposModule } from './modules/academico/grupos/grupos.module';
import { MaterialComplModule } from './modules/academico/material-compl/material-compl.module';
import { InicioModule } from './modules/administracion/inicio/inicio.module';
import { PagosModule } from './modules/administracion/pagos/pagos.module';
import { UsuariosModule } from './modules/administracion/usuarios/usuarios.module';
import { KineModule } from './modules/salud/kine/kine.module';
import { NutriModule } from './modules/salud/nutri/nutri.module';

@Module({
  imports: [GruposModule, AsistenciaModule, ClasesModule, EvaluacionFisicaModule, MaterialComplModule, InicioModule, PagosModule, UsuariosModule, KineModule, NutriModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
