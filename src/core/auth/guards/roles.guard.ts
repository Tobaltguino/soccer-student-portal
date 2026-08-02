import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../../supabase/supabase.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';
import type { UsuarioPerfilRow } from '../../../shared/interfaces/usuario-perfil.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const { data, error } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('rol, activo')
      .eq('id_usuario', userId)
      .single<Pick<UsuarioPerfilRow, 'rol' | 'activo'>>();

    if (error || !data) {
      throw new ForbiddenException('Perfil no encontrado');
    }

    if (!data.activo) {
      throw new ForbiddenException('Usuario inactivo');
    }

    if (!requiredRoles.includes(data.rol)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }

    return true;
  }
}