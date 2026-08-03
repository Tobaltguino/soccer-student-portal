import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from 'src/core/supabase/supabase.service';
import { CrearTipoEvaluacionDto } from './dto/crear-tipo-evaluacion.dto';
import { ActualizarTipoEvaluacionDto } from './dto/actualizar-tipo-evaluacion.dto';
import type { TipoEvaluacionRow } from './interfaces/tipo-evaluacion.interfaces';
import { lanzarErrorSupabase } from 'src/shared/utils/supabase-error.util';

@Injectable()
export class TipoEvaluacionService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(dto: CrearTipoEvaluacionDto): Promise<TipoEvaluacionRow> {
    const { data, error } = await this.supabase.client
      .from('tipo_evaluacion')
      .insert({
        nombre: dto.nombre,
        unidad_medida: dto.unidadMedida,
        descripcion: dto.descripcion ?? null,
      })
      .select()
      .single<TipoEvaluacionRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo crear el tipo de evaluación');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el tipo de evaluación creado');
    }

    return data;
  }

  async listar(): Promise<TipoEvaluacionRow[]> {
    const { data, error } = await this.supabase.client
      .from('tipo_evaluacion')
      .select('*')
      .order('nombre');

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo listar los tipos de evaluación');
    }

    return data ?? [];
  }

  async buscarPorId(id: number): Promise<TipoEvaluacionRow> {
    const { data, error } = await this.supabase.client
      .from('tipo_evaluacion')
      .select('*')
      .eq('id', id)
      .single<TipoEvaluacionRow>();

    if (error || !data) {
      throw new NotFoundException('Tipo de evaluación no encontrado');
    }

    return data;
  }

  async actualizar(
    id: number,
    dto: ActualizarTipoEvaluacionDto,
  ): Promise<TipoEvaluacionRow> {
    const { data, error } = await this.supabase.client
      .from('tipo_evaluacion')
      .update({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.unidadMedida !== undefined && { unidad_medida: dto.unidadMedida }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
      })
      .eq('id', id)
      .select()
      .single<TipoEvaluacionRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo actualizar el tipo de evaluación');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el tipo de evaluación actualizado');
    }

    return data;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('tipo_evaluacion')
      .delete()
      .eq('id', id);

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo eliminar el tipo de evaluación');
    }
  }
}