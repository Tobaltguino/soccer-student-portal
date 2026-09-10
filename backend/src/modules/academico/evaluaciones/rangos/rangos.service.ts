import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { CrearRangoDto } from './dto/crear-rango.dto';
import { ActualizarRangoDto } from './dto/actualizar-rango.dto';
import type { RangoRow } from './interfaces/rango.interface';
import { lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';

@Injectable()
export class RangosService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(dto: CrearRangoDto): Promise<RangoRow> {
    const { data, error } = await this.supabase.client
      .from('evaluacion_rangos')
      .insert({
        tipo_evaluacion_id: dto.tipoEvaluacionId,
        genero: dto.genero,
        nombre_etiqueta: dto.nombreEtiqueta,
        valor_min: dto.valorMin,
        valor_max: dto.valorMax,
        edad_min: dto.edadMin,
        edad_max: dto.edadMax,
        color_sugerido: dto.colorSugerido ?? null,
      })
      .select()
      .single<RangoRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear el rango',
        'El tipo de evaluación indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el rango creado');
    }

    return data;
  }

  async listarPorTipoEvaluacion(tipoEvaluacionId: number): Promise<RangoRow[]> {
    const { data, error } = await this.supabase.client
      .from('evaluacion_rangos')
      .select('*')
      .eq('tipo_evaluacion_id', tipoEvaluacionId)
      .order('edad_min')
      .order('valor_min');

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar los rangos: ${error.message}`);
    }

    return data ?? [];
  }

  async buscarPorId(id: number): Promise<RangoRow> {
    const { data, error } = await this.supabase.client
      .from('evaluacion_rangos')
      .select('*')
      .eq('id', id)
      .single<RangoRow>();

    if (error || !data) {
      throw new NotFoundException('Rango no encontrado');
    }

    return data;
  }

  async actualizar(id: number, dto: ActualizarRangoDto): Promise<RangoRow> {
    const { data, error } = await this.supabase.client
      .from('evaluacion_rangos')
      .update({
        ...(dto.tipoEvaluacionId !== undefined && { tipo_evaluacion_id: dto.tipoEvaluacionId }),
        ...(dto.genero !== undefined && { genero: dto.genero }),
        ...(dto.nombreEtiqueta !== undefined && { nombre_etiqueta: dto.nombreEtiqueta }),
        ...(dto.valorMin !== undefined && { valor_min: dto.valorMin }),
        ...(dto.valorMax !== undefined && { valor_max: dto.valorMax }),
        ...(dto.edadMin !== undefined && { edad_min: dto.edadMin }),
        ...(dto.edadMax !== undefined && { edad_max: dto.edadMax }),
        ...(dto.colorSugerido !== undefined && { color_sugerido: dto.colorSugerido }),
      })
      .eq('id', id)
      .select()
      .single<RangoRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo actualizar el rango',
        'El tipo de evaluación indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el rango actualizado');
    }

    return data;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('evaluacion_rangos')
      .delete()
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar el rango: ${error.message}`);
    }
  }

  /**
   * Dado un tipo de evaluación, la edad del estudiante y el valor obtenido,
   * encuentra en qué rango/categoría cae (ej. "Alto", con su color).
   * Devuelve null si no hay ningún rango definido para esa combinación.
   */
  async encontrarRango(
    tipoEvaluacionId: number,
    edad: number,
    valor: number,
    genero: string,
  ): Promise<RangoRow | null> {
    const { data, error } = await this.supabase.client
      .from('evaluacion_rangos')
      .select('*')
      .eq('tipo_evaluacion_id', tipoEvaluacionId)
      .eq('genero', genero)
      .lte('edad_min', edad)
      .gte('edad_max', edad)
      .lte('valor_min', valor)
      .gte('valor_max', valor)
      .maybeSingle<RangoRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo determinar el rango: ${error.message}`);
    }

    return data;
  }
}