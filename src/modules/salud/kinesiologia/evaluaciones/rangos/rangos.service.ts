import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../../core/supabase/supabase.service';
import { CrearRangoDto } from './dto/crear-rango.dto';
import { ActualizarRangoDto } from './dto/actualizar-rango.dto';
import type { KineRangoRow } from './interfaces/rango.interface';
import { lanzarErrorSupabaseConFk } from '../../../../../shared/utils/supabase-error.util';

@Injectable()
export class RangosService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(dto: CrearRangoDto): Promise<KineRangoRow> {
    const { data, error } = await this.supabase.client
      .from('kine_evaluacion_rangos')
      .insert({
        subevaluacion_id: dto.subevaluacionId,
        puntaje: dto.puntaje,
        etiqueta: dto.etiqueta,
        color: dto.color ?? null,
        descripcion: dto.descripcion ?? null,
      })
      .select()
      .single<KineRangoRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear el rango',
        'La subevaluación indicada no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el rango creado');
    }

    return data;
  }

  async listarPorSubevaluacion(subevaluacionId: number): Promise<KineRangoRow[]> {
    const { data, error } = await this.supabase.client
      .from('kine_evaluacion_rangos')
      .select('*')
      .eq('subevaluacion_id', subevaluacionId)
      .order('puntaje');

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar los rangos: ${error.message}`);
    }

    return data ?? [];
  }

  async buscarPorId(id: number): Promise<KineRangoRow> {
    const { data, error } = await this.supabase.client
      .from('kine_evaluacion_rangos')
      .select('*')
      .eq('id', id)
      .single<KineRangoRow>();

    if (error || !data) {
      throw new NotFoundException('Rango no encontrado');
    }

    return data;
  }

  async actualizar(id: number, dto: ActualizarRangoDto): Promise<KineRangoRow> {
    const { data, error } = await this.supabase.client
      .from('kine_evaluacion_rangos')
      .update({
        ...(dto.subevaluacionId !== undefined && { subevaluacion_id: dto.subevaluacionId }),
        ...(dto.puntaje !== undefined && { puntaje: dto.puntaje }),
        ...(dto.etiqueta !== undefined && { etiqueta: dto.etiqueta }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
      })
      .eq('id', id)
      .select()
      .single<KineRangoRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo actualizar el rango',
        'La subevaluación indicada no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el rango actualizado');
    }

    return data;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('kine_evaluacion_rangos')
      .delete()
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar el rango: ${error.message}`);
    }
  }
}