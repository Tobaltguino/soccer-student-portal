import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { SupabaseModule } from './core/supabase/supabase.module';
import { AuthModule } from './core/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AcademicoModule } from './modules/academico/academico.module';
import { AdministracionModule } from './modules/administracion/administracion.module';
import { SaludModule } from './modules/salud/salud.module';

import { SharedModule } from './shared/shared.module';
import { AuditModule } from './core/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    UsuariosModule, 
    AcademicoModule,
    AdministracionModule,
    SaludModule,
    SharedModule,
    AuditModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}