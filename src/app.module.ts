import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './core/supabase/supabase.module';
import { AuthModule } from './core/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AcademicoModule } from './modules/academico/academico.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    UsuariosModule, // <-- NestJS cargará este, y este a su vez cargará al resto
    AcademicoModule,
  ],
})
export class AppModule {}