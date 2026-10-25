import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  AceptacionLegal,
  AceptarTerminosPayload
} from '../models/aceptacion-legal.interface';

@Injectable({
  providedIn: 'root'
})
export class AceptacionLegalService {
  private supabase = inject(SupabaseService).client;

  /**
   * Registra o actualiza la aceptación de los términos y condiciones.
   * La base de datos (PostgreSQL) se encarga de capturar la IP real y el ID del usuario.
   */
  async aceptarTerminos(payload: AceptarTerminosPayload): Promise<AceptacionLegal> {
    const { data, error } = await this.supabase.rpc('aceptar_terminos_legales', {
      p_version_terminos: payload.versionTerminos,
      p_version_politica: payload.versionPolitica
    });

    if (error || !data) {
      throw new Error(`No se pudo registrar la aceptación: ${error?.message || 'Error desconocido'}`);
    }

    return data as AceptacionLegal;
  }

  /**
   * Consulta el registro de aceptación legal del usuario autenticado.
   */
  async obtenerMiAceptacion(): Promise<AceptacionLegal | null> {
    const { data: authData } = await this.supabase.auth.getSession();
    const usuarioId = authData?.session?.user?.id;

    if (!usuarioId) {
      throw new Error('Debes iniciar sesión');
    }

    const { data, error } = await this.supabase
      .from('aceptaciones_legales')
      .select('*')
      .eq('usuario_id', usuarioId)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo consultar la aceptación: ${error.message}`);
    }

    return data as AceptacionLegal | null;
  }
}