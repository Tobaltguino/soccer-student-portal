import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { ActualizarWebConfiguracionDto } from './dto/actualizar-web-configuracion.dto';
import { lanzarErrorSupabase } from '../../../../shared/utils/supabase-error.util';

@Injectable()
export class WebConfiguracionService {
  constructor(private readonly supabase: SupabaseService) {}

  private mapearConfiguracion(row: any) {
    if (!row) return null;
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

  async obtener(): Promise<any> {
    const { data, error } = await this.supabase.client
      .from('web_configuracion')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      throw new NotFoundException('Configuración web no encontrada');
    }

    return this.mapearConfiguracion(data);
  }

  async obtenerDatosLanding(): Promise<any> {
    const [config, metodologias, programas, auspiciadores, beneficios] = await Promise.all([
      this.supabase.client.from('web_configuracion').select('*').eq('id', 1).single(),
      this.supabase.client.from('web_metodologias').select('*').order('orden'),
      this.supabase.client.from('web_programas').select('*').order('orden'),
      this.supabase.client.from('web_auspiciadores').select('*').order('orden'),
      this.supabase.client.from('web_beneficios').select('*').order('orden'),
    ]);

    return {
      configuracion: this.mapearConfiguracion(config.data),
      metodologias: (metodologias.data ?? []).map(m => ({ id: m.id, icono: m.icono, titulo: m.titulo, descripcion: m.descripcion, orden: m.orden })),
      programas: (programas.data ?? []).map(p => ({ id: p.id, icono: p.icono, titulo: p.titulo, descripcion: p.descripcion, orden: p.orden, colorFondo: p.color_fondo, colorTexto: p.color_texto })),
      auspiciadores: (auspiciadores.data ?? []).map(a => ({ id: a.id, nombre: a.nombre, descripcion: a.descripcion, orden: a.orden, imagenUrl: a.imagen_url, instagramUrl: a.instagram_url })),
      beneficios: (beneficios.data ?? []).map(b => ({ id: b.id, nombre: b.nombre, descripcion: b.descripcion, orden: b.orden, imagenUrl: b.imagen_url, instagramUrl: b.instagram_url })),
    };
  }

  async actualizar(dto: ActualizarWebConfiguracionDto): Promise<any> {
    const { data, error } = await this.supabase.client
      .from('web_configuracion')
      .upsert({
        id: 1,
        ...(dto.telefono !== undefined && { telefono: dto.telefono }),
        ...(dto.correo !== undefined && { correo: dto.correo }),
        ...(dto.instagramNombre !== undefined && { instagram_nombre: dto.instagramNombre }),
        ...(dto.instagramUrl !== undefined && { instagram_url: dto.instagramUrl }),
        ...(dto.facebookNombre !== undefined && { facebook_nombre: dto.facebookNombre }),
        ...(dto.facebookUrl !== undefined && { facebook_url: dto.facebookUrl }),
        ...(dto.whatsappMensaje !== undefined && { whatsapp_mensaje: dto.whatsappMensaje }),
        ...(dto.heroTitulo !== undefined && { hero_titulo: dto.heroTitulo }),
        ...(dto.heroSubtitulo !== undefined && { hero_subtitulo: dto.heroSubtitulo }),
      })
      .select()
      .single();

    if (error) lanzarErrorSupabase(error, 'No se pudo actualizar la configuración web');
    if (!data) throw new InternalServerErrorException('No se recibió la configuración actualizada');

    return this.mapearConfiguracion(data);
  }
}