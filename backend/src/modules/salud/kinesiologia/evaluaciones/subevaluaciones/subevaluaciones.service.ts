// modules/salud/kinesiologia/evaluaciones/subevaluaciones/subevaluaciones.service.ts
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../../core/supabase/supabase.service';
import { CrearSubevaluacionDto } from './dto/crear-subevaluacion.dto';
import { ActualizarSubevaluacionDto } from './dto/actualizar-subevaluacion.dto';
import type { SubevaluacionRow } from './interfaces/subevaluacion.interface';
import { lanzarErrorSupabase, lanzarErrorSupabaseConFk } from '../../../../../shared/utils/supabase-error.util';

@Injectable()
export class SubevaluacionesService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(dto: CrearSubevaluacionDto): Promise<SubevaluacionRow> {
    const { data, error } = await this.supabase.client
      .from('kine_subevaluaciones')
      .insert({
        tipo_evaluacion_id: dto.tipoEvaluacionId,
        nombre: dto.nombre,
        evalua_lados: dto.evaluaLados ?? false,
      })
      .select()
      .single<SubevaluacionRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear la subevaluación',
        'El tipo de evaluación indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la subevaluación creada');
    }

    return data;
  }

  async listarPorTipoEvaluacion(tipoEvaluacionId: number): Promise<SubevaluacionRow[]> {
    const { data, error } = await this.supabase.client
      .from('kine_subevaluaciones')
      .select('*')
      .eq('tipo_evaluacion_id', tipoEvaluacionId)
      .order('nombre');

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo listar las subevaluaciones');
    }

    return data ?? [];
  }

  async buscarPorId(id: number): Promise<SubevaluacionRow> {
    const { data, error } = await this.supabase.client
      .from('kine_subevaluaciones')
      .select('*')
      .eq('id', id)
      .single<SubevaluacionRow>();

    if (error || !data) {
      throw new NotFoundException('Subevaluación no encontrada');
    }

    return data;
  }

  async actualizar(id: number, dto: ActualizarSubevaluacionDto): Promise<SubevaluacionRow> {
    const { data, error } = await this.supabase.client
      .from('kine_subevaluaciones')
      .update({
        ...(dto.tipoEvaluacionId !== undefined && { tipo_evaluacion_id: dto.tipoEvaluacionId }),
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.evaluaLados !== undefined && { evalua_lados: dto.evaluaLados }),
      })
      .eq('id', id)
      .select()
      .single<SubevaluacionRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo actualizar la subevaluación',
        'El tipo de evaluación indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la subevaluación actualizada');
    }

    return data;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('kine_subevaluaciones')
      .delete()
      .eq('id', id);

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo eliminar la subevaluación');
    }
  }
}