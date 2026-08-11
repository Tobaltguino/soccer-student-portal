import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../../../../../../backend/src/core/supabase/supabase.service';
import { CrearWebMetodologiaDto } from './dto/crear-web-metodologia.dto';
import { ActualizarWebMetodologiaDto } from './dto/actualizar-web-metodologia.dto';
import type { WebMetodologiaRow } from './interfaces/web-metodologia.interface';
import { lanzarErrorSupabase } from '../../../../../../../../../backend/src/shared/utils/supabase-error.util';

@Injectable()
export class WebMetodologiasService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(dto: CrearWebMetodologiaDto): Promise<WebMetodologiaRow> {
    const { data, error } = await this.supabase.client
      .from('web_metodologias')
      .insert({
        icono: dto.icono,
        titulo: dto.titulo,
        descripcion: dto.descripcion ?? null,
        orden: dto.orden ?? 0,
      })
      .select()
      .single<WebMetodologiaRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo crear la metodología');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la metodología creada');
    }

    return data;
  }

  async listar(): Promise<WebMetodologiaRow[]> {
    const { data, error } = await this.supabase.client
      .from('web_metodologias')
      .select('*')
      .order('orden');

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo listar las metodologías');
    }

    return data ?? [];
  }

  async buscarPorId(id: number): Promise<WebMetodologiaRow> {
    const { data, error } = await this.supabase.client
      .from('web_metodologias')
      .select('*')
      .eq('id', id)
      .single<WebMetodologiaRow>();

    if (error || !data) {
      throw new NotFoundException('Metodología no encontrada');
    }

    return data;
  }

  async actualizar(id: number, dto: ActualizarWebMetodologiaDto): Promise<WebMetodologiaRow> {
    const { data, error } = await this.supabase.client
      .from('web_metodologias')
      .update({
        ...(dto.icono !== undefined && { icono: dto.icono }),
        ...(dto.titulo !== undefined && { titulo: dto.titulo }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.orden !== undefined && { orden: dto.orden }),
      })
      .eq('id', id)
      .select()
      .single<WebMetodologiaRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo actualizar la metodología');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la metodología actualizada');
    }

    return data;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('web_metodologias')
      .delete()
      .eq('id', id);

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo eliminar la metodología');
    }
  }
}