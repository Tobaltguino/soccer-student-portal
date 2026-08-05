import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { ActualizarWebConfiguracionDto } from './dto/actualizar-web-configuracion.dto';
import type { WebConfiguracionRow } from './interfaces/web-configuracion.interface';
import { lanzarErrorSupabase } from '../../../../shared/utils/supabase-error.util';

@Injectable()
export class WebConfiguracionService {
  constructor(private readonly supabase: SupabaseService) {}

  async obtener(): Promise<WebConfiguracionRow> {
    const { data, error } = await this.supabase.client
      .from('web_configuracion')
      .select('*')
      .eq('id', 1)
      .single<WebConfiguracionRow>();

    if (error || !data) {
      throw new NotFoundException('Configuración web no encontrada');
    }

    return data;
  }

  async actualizar(dto: ActualizarWebConfiguracionDto): Promise<WebConfiguracionRow> {
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
      .single<WebConfiguracionRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo actualizar la configuración web');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la configuración actualizada');
    }

    return data;
  }
}