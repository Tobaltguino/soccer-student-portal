import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { CrearWebProgramaDto } from './dto/crear-web-programa.dto';
import { ActualizarWebProgramaDto } from './dto/actualizar-web-programa.dto';
import type { WebProgramaRow } from './interfaces/web-programa.interface';
import { lanzarErrorSupabase } from '../../../../shared/utils/supabase-error.util';

@Injectable()
export class WebProgramasService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(dto: CrearWebProgramaDto): Promise<WebProgramaRow> {
    const { data, error } = await this.supabase.client
      .from('web_programas')
      .insert({
        icono: dto.icono,
        color_fondo: dto.colorFondo ?? null,
        color_texto: dto.colorTexto ?? null,
        titulo: dto.titulo,
        descripcion: dto.descripcion ?? null,
        orden: dto.orden ?? 0,
      })
      .select()
      .single<WebProgramaRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo crear el programa');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el programa creado');
    }

    return data;
  }

  async listar(): Promise<WebProgramaRow[]> {
    const { data, error } = await this.supabase.client
      .from('web_programas')
      .select('*')
      .order('orden');

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo listar los programas');
    }

    return data ?? [];
  }

  async buscarPorId(id: number): Promise<WebProgramaRow> {
    const { data, error } = await this.supabase.client
      .from('web_programas')
      .select('*')
      .eq('id', id)
      .single<WebProgramaRow>();

    if (error || !data) {
      throw new NotFoundException('Programa no encontrado');
    }

    return data;
  }

  async actualizar(id: number, dto: ActualizarWebProgramaDto): Promise<WebProgramaRow> {
    const { data, error } = await this.supabase.client
      .from('web_programas')
      .update({
        ...(dto.icono !== undefined && { icono: dto.icono }),
        ...(dto.colorFondo !== undefined && { color_fondo: dto.colorFondo }),
        ...(dto.colorTexto !== undefined && { color_texto: dto.colorTexto }),
        ...(dto.titulo !== undefined && { titulo: dto.titulo }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.orden !== undefined && { orden: dto.orden }),
      })
      .eq('id', id)
      .select()
      .single<WebProgramaRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo actualizar el programa');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el programa actualizado');
    }

    return data;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('web_programas')
      .delete()
      .eq('id', id);

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo eliminar el programa');
    }
  }
}