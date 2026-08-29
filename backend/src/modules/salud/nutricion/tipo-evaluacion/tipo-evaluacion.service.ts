import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { CrearTipoEvaluacionDto } from './dto/crear-tipo-evaluacion.dto';
import { ActualizarTipoEvaluacionDto } from './dto/actualizar-tipo-evaluacion.dto';
import type { NutriTipoEvaluacionRow } from './interfaces/tipo-evaluacion.interface';
import { lanzarErrorSupabase, lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';

@Injectable()
export class TipoEvaluacionService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(dto: CrearTipoEvaluacionDto): Promise<NutriTipoEvaluacionRow> {
    const { data, error } = await this.supabase.client
      .from('nutri_tipo_evaluacion')
      .insert({
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
      })
      .select()
      .single<NutriTipoEvaluacionRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo crear el tipo de evaluación');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el tipo de evaluación creado');
    }

    return data;
  }

  async listar(): Promise<NutriTipoEvaluacionRow[]> {
    const { data, error } = await this.supabase.client
      .from('nutri_tipo_evaluacion')
      .select('*')
      .order('nombre');

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo listar los tipos de evaluación');
    }

    return data ?? [];
  }

  async buscarPorId(id: string): Promise<NutriTipoEvaluacionRow> {
    const { data, error } = await this.supabase.client
      .from('nutri_tipo_evaluacion')
      .select('*')
      .eq('id', id)
      .single<NutriTipoEvaluacionRow>();

    if (error || !data) {
      throw new NotFoundException('Tipo de evaluación no encontrado');
    }

    return data;
  }

  async actualizar(
    id: string,
    dto: ActualizarTipoEvaluacionDto,
  ): Promise<NutriTipoEvaluacionRow> {
    const { data, error } = await this.supabase.client
      .from('nutri_tipo_evaluacion')
      .update({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
      })
      .eq('id', id)
      .select()
      .single<NutriTipoEvaluacionRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo actualizar el tipo de evaluación');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el tipo de evaluación actualizado');
    }

    return data;
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('nutri_tipo_evaluacion')
      .delete()
      .eq('id', id);

    if (error) {
      // FIX: Atrapamos el error de llave foránea por si el tipo ya está siendo usado en una sesión
      lanzarErrorSupabaseConFk(
        error, 
        'No se pudo eliminar el tipo de evaluación', 
        'No se puede eliminar porque existen sesiones asociadas a este tipo de evaluación'
      );
    }
  }
}