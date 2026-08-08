import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../../core/supabase/supabase.service';
import { CrearTipoEvaluacionDto } from './dto/crear-tipo-evaluacion.dto';
import { ActualizarTipoEvaluacionDto } from './dto/actualizar-tipo-evaluacion.dto';
import type { KineTipoEvaluacionRow } from './interfaces/tipo-evaluacion.interface';
import { lanzarErrorSupabase } from '../../../../../shared/utils/supabase-error.util';

@Injectable()
export class TiposEvaluacionService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(dto: CrearTipoEvaluacionDto): Promise<KineTipoEvaluacionRow> {
    const { data, error } = await this.supabase.client
      .from('kine_tipos_evaluacion')
      .insert({
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
      })
      .select()
      .single<KineTipoEvaluacionRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo crear el tipo de evaluación');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el tipo de evaluación creado');
    }

    return data;
  }

  async listar(): Promise<KineTipoEvaluacionRow[]> {
    const { data, error } = await this.supabase.client
      .from('kine_tipos_evaluacion')
      .select('*')
      .order('nombre');

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo listar los tipos de evaluación');
    }

    return data ?? [];
  }

  async buscarPorId(id: number): Promise<KineTipoEvaluacionRow> {
    const { data, error } = await this.supabase.client
      .from('kine_tipos_evaluacion')
      .select('*')
      .eq('id', id)
      .single<KineTipoEvaluacionRow>();

    if (error || !data) {
      throw new NotFoundException('Tipo de evaluación no encontrado');
    }

    return data;
  }

  async actualizar(
    id: number,
    dto: ActualizarTipoEvaluacionDto,
  ): Promise<KineTipoEvaluacionRow> {
    const { data, error } = await this.supabase.client
      .from('kine_tipos_evaluacion')
      .update({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
      })
      .eq('id', id)
      .select()
      .single<KineTipoEvaluacionRow>();

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
      .from('kine_tipos_evaluacion')
      .delete()
      .eq('id', id);

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo eliminar el tipo de evaluación');
    }
  }
}