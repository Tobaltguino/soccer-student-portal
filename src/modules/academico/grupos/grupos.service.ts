import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { CrearGrupoDto } from './dto/crear-grupo.dto';
import { ActualizarGrupoDto } from './dto/actualizar-grupo.dto';
import type { GrupoRow } from './interfaces/grupo.interface';
import { lanzarErrorSupabase } from '../../../shared/utils/supabase-error.util';

@Injectable()
export class GruposService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(dto: CrearGrupoDto): Promise<GrupoRow> {
    const { data, error } = await this.supabase.client
      .from('grupos')
      .insert({ nombre: dto.nombre, descripcion: dto.descripcion ?? null })
      .select()
      .single<GrupoRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo crear el grupo');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el grupo creado');
    }

    return data;
  }

  async listar(incluirEliminados: boolean = false): Promise<GrupoRow[]> {
    let query = this.supabase.client.from('grupos').select('*').order('nombre');

    if (!incluirEliminados) {
      query = query.is('eliminado_at', null);
    }

    const { data, error } = await query;

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo listar los grupos');
    }

    return data ?? [];
  }

  async buscarPorId(id: number): Promise<GrupoRow> {
    const { data, error } = await this.supabase.client
      .from('grupos')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single<GrupoRow>();

    if (error || !data) {
      throw new NotFoundException('Grupo no encontrado');
    }

    return data;
  }

  async actualizar(id: number, dto: ActualizarGrupoDto): Promise<GrupoRow> {
    const { data, error } = await this.supabase.client
      .from('grupos')
      .update({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
      })
      .eq('id', id)
      .select()
      .single<GrupoRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo actualizar el grupo');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el grupo actualizado');
    }

    return data;
  }

  async eliminar(id: number): Promise<GrupoRow> {
    const { data, error } = await this.supabase.client
      .from('grupos')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single<GrupoRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo eliminar el grupo');
    }

    if (!data) {
      throw new NotFoundException('Grupo no encontrado');
    }

    return data;
  }

  async restaurar(id: number): Promise<GrupoRow> {
    const { data, error } = await this.supabase.client
      .from('grupos')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single<GrupoRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo restaurar el grupo');
    }

    if (!data) {
      throw new NotFoundException('Grupo no encontrado');
    }

    return data;
  }
}