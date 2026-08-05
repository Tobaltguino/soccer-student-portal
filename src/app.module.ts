import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './core/supabase/supabase.module';
import { AuthModule } from './core/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AcademicoModule } from './modules/academico/academico.module';
import { AdministracionModule } from './modules/administracion/administracion.module';
import { SaludModule } from './modules/salud/salud.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    UsuariosModule, 
    AcademicoModule,
    AdministracionModule,
    SaludModule
  ],
})
export class AppModule {}