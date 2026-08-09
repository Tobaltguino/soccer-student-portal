import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface RegistroAuditoriaInput {
  usuarioId: string | null;
  usuarioEmail: string | null;
  usuarioRol: string | null;
  metodo: string;
  ruta: string;
  parametros?: Record<string, any>;
  cuerpoEnviado?: Record<string, any>;
  statusCode: number;
  ipAddress: string | null;
}

@Injectable()
export class AuditoriaService {
  constructor(private readonly supabase: SupabaseService) {}

  async registrar(input: RegistroAuditoriaInput): Promise<void> {
    const { error } = await this.supabase.client.from('auditoria').insert({
      usuario_id: input.usuarioId,
      usuario_email: input.usuarioEmail,
      usuario_rol: input.usuarioRol,
      metodo: input.metodo,
      ruta: input.ruta,
      parametros: input.parametros ?? null,
      cuerpo_enviado: this.limpiarCamposSensibles(input.cuerpoEnviado),
      status_code: input.statusCode,
      ip_address: input.ipAddress,
    });

    if (error) {
      // No lanzamos error: un fallo de auditoría no debe romper la operación real del usuario
      console.error('Error al registrar auditoría:', error.message);
    }
  }

  /**
   * Nunca guardamos contraseñas u otros campos sensibles dentro del cuerpo auditado.
   */
  private limpiarCamposSensibles(
    cuerpo?: Record<string, any>,
  ): Record<string, any> | null {
    if (!cuerpo) return null;

    const { passwordTemporal, password, ...resto } = cuerpo;
    return resto;
  }
}