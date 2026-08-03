import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { CrearClaseDto } from './dto/crear-clase.dto';
import { ActualizarClaseDto } from './dto/actualizar-clase.dto';
import type { ClaseRow } from './interfaces/clase.interface';
import { lanzarErrorSupabaseConFk } from '../../../shared/utils/supabase-error.util';

@Injectable()
export class ClasesService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(dto: CrearClaseDto): Promise<ClaseRow> {
    const { data, error } = await this.supabase.client
      .from('clases')
      .insert({
        grupo_id: dto.grupoId,
        profesor_id: dto.profesorId ?? null,
        fecha: dto.fecha,
        hora: dto.hora,
        lugar: dto.lugar ?? null,
        objetivo: dto.objetivo ?? null,
        calentamiento: dto.calentamiento ?? null,
        parte_principal: dto.partePrincipal ?? null,
        vuelta_calma: dto.vueltaCalma ?? null,
      })
      .select()
      .single<ClaseRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear la clase',
        'El grupo o profesor indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la clase creada');
    }

    return data;
  }

  async listar(grupoId?: number, incluirEliminadas: boolean = false): Promise<ClaseRow[]> {
    let query = this.supabase.client.from('clases').select('*').order('fecha', { ascending: false });

    if (grupoId !== undefined) {
      query = query.eq('grupo_id', grupoId);
    }

    if (!incluirEliminadas) {
      query = query.is('eliminado_at', null);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar las clases: ${error.message}`);
    }

    return data ?? [];
  }

  async buscarPorId(id: number): Promise<ClaseRow> {
    const { data, error } = await this.supabase.client
      .from('clases')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single<ClaseRow>();

    if (error || !data) {
      throw new NotFoundException('Clase no encontrada');
    }

    return data;
  }

  async actualizar(id: number, dto: ActualizarClaseDto): Promise<ClaseRow> {
    const { data, error } = await this.supabase.client
      .from('clases')
      .update({
        ...(dto.grupoId !== undefined && { grupo_id: dto.grupoId }),
        ...(dto.profesorId !== undefined && { profesor_id: dto.profesorId }),
        ...(dto.fecha !== undefined && { fecha: dto.fecha }),
        ...(dto.hora !== undefined && { hora: dto.hora }),
        ...(dto.lugar !== undefined && { lugar: dto.lugar }),
        ...(dto.objetivo !== undefined && { objetivo: dto.objetivo }),
        ...(dto.calentamiento !== undefined && { calentamiento: dto.calentamiento }),
        ...(dto.partePrincipal !== undefined && { parte_principal: dto.partePrincipal }),
        ...(dto.vueltaCalma !== undefined && { vuelta_calma: dto.vueltaCalma }),
      })
      .eq('id', id)
      .select()
      .single<ClaseRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo actualizar la clase',
        'El grupo o profesor indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la clase actualizada');
    }

    return data;
  }

  async eliminar(id: number): Promise<ClaseRow> {
    const { data, error } = await this.supabase.client
      .from('clases')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single<ClaseRow>();

    if (error) {
      lanzarErrorSupabaseConFk(error, 'No se pudo eliminar la clase', 'La clase indicada no existe');
    }

    if (!data) {
      throw new NotFoundException('Clase no encontrada');
    }

    return data;
  }

  async restaurar(id: number): Promise<ClaseRow> {
    const { data, error } = await this.supabase.client
      .from('clases')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single<ClaseRow>();

    if (error) {
      lanzarErrorSupabaseConFk(error, 'No se pudo restaurar la clase', 'La clase indicada no existe');
    }

    if (!data) {
      throw new NotFoundException('Clase no encontrada');
    }

    return data;
  }
}