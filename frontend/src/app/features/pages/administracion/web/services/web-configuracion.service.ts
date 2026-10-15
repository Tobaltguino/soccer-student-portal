import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  WebConfiguracion,
  ActualizarWebConfiguracionPayload,
  LandingData
} from '../models/web-configuracion.interface';

@Injectable({
  providedIn: 'root'
})
export class WebConfiguracionService {
  private supabase = inject(SupabaseService).client;

  /**
   * Obtiene la configuración general de la web (Contacto, Redes, Textos Hero).
   */
  async obtenerConfiguracion(): Promise<WebConfiguracion> {
    const { data, error } = await this.supabase
      .from('web_configuracion')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      throw new Error('Configuración web no encontrada');
    }

    return this.mapearConfiguracion(data);
  }

  /**
   * Obtiene todos los datos necesarios para renderizar la Landing Page en una sola llamada concurrente.
   */
  async obtenerDatosLanding(): Promise<LandingData> {
    const [config, metodologias, programas, auspiciadores, beneficios] = await Promise.all([
      this.supabase.from('web_configuracion').select('*').eq('id', 1).single(),
      this.supabase.from('web_metodologias').select('*').order('orden', { ascending: true }),
      this.supabase.from('web_programas').select('*').order('orden', { ascending: true }),
      this.supabase.from('web_auspiciadores').select('*').order('orden', { ascending: true }),
      this.supabase.from('web_beneficios').select('*').order('orden', { ascending: true }),
    ]);

    // Omitimos validaciones de error individuales para no romper toda la página si falla una sección menor,
    // pero garantizamos que la configuración base exista.
    if (config.error || !config.data) {
      throw new Error('No se pudo cargar la configuración de la Landing Page');
    }

    return {
      configuracion: this.mapearConfiguracion(config.data),
      metodologias: (metodologias.data ?? []).map((m: any) => ({
        id: m.id,
        icono: m.icono,
        titulo: m.titulo,
        descripcion: m.descripcion,
        orden: m.orden,
      })),
      programas: (programas.data ?? []).map((p: any) => ({
        id: p.id,
        icono: p.icono,
        titulo: p.titulo,
        descripcion: p.descripcion,
        orden: p.orden,
        colorFondo: p.color_fondo,
        colorTexto: p.color_texto,
      })),
      auspiciadores: (auspiciadores.data ?? []).map((a: any) => ({
        id: a.id,
        nombre: a.nombre,
        descripcion: a.descripcion,
        orden: a.orden,
        imagenUrl: a.imagen_url,
        instagramUrl: a.instagram_url,
      })),
      beneficios: (beneficios.data ?? []).map((b: any) => ({
        id: b.id,
        nombre: b.nombre,
        descripcion: b.descripcion,
        orden: b.orden,
        imagenUrl: b.imagen_url,
        instagramUrl: b.instagram_url,
      })),
    };
  }

  /**
   * Actualiza la configuración general de la web (Solo Administrador).
   */
  async actualizarConfiguracion(payload: ActualizarWebConfiguracionPayload): Promise<WebConfiguracion> {
    const updateData: Record<string, any> = { id: 1 };

    if (payload.telefono !== undefined) updateData['telefono'] = payload.telefono;
    if (payload.correo !== undefined) updateData['correo'] = payload.correo;
    if (payload.instagramNombre !== undefined) updateData['instagram_nombre'] = payload.instagramNombre;
    if (payload.instagramUrl !== undefined) updateData['instagram_url'] = payload.instagramUrl;
    if (payload.facebookNombre !== undefined) updateData['facebook_nombre'] = payload.facebookNombre;
    if (payload.facebookUrl !== undefined) updateData['facebook_url'] = payload.facebookUrl;
    if (payload.whatsappMensaje !== undefined) updateData['whatsapp_mensaje'] = payload.whatsappMensaje;
    if (payload.heroTitulo !== undefined) updateData['hero_titulo'] = payload.heroTitulo;
    if (payload.heroSubtitulo !== undefined) updateData['hero_subtitulo'] = payload.heroSubtitulo;

    const { data, error } = await this.supabase
      .from('web_configuracion')
      .upsert(updateData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar la configuración web: ${error?.message || 'Error desconocido'}`);
    }

    return this.mapearConfiguracion(data);
  }

  // =========================================================================
  // MÉTODOS PRIVADOS PARA MAPEO
  // =========================================================================
  private mapearConfiguracion(row: any): WebConfiguracion {
    return {
      id: row.id,
      telefono: row.telefono,
      correo: row.correo,
      instagramNombre: row.instagram_nombre,
      instagramUrl: row.instagram_url,
      facebookNombre: row.facebook_nombre,
      facebookUrl: row.facebook_url,
      whatsappMensaje: row.whatsapp_mensaje,
      heroTitulo: row.hero_titulo,
      heroSubtitulo: row.hero_subtitulo,
    };
  }
}