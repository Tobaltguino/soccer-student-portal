import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  RangoEvaluacion,
  CrearRangoPayload,
  ActualizarRangoPayload
} from '../models/rango.interface';

@Injectable({
  providedIn: 'root'
})
export class RangoEvaluacionService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea un nuevo rango para un tipo de evaluación específico (Solo Administrador según RLS).
   */
  async crearRango(payload: CrearRangoPayload): Promise<RangoEvaluacion> {
    const { data, error } = await this.supabase
      .from('aca_evaluacion_rangos')
      .insert({
        tipo_evaluacion_id: payload.tipoEvaluacionId,
        genero: payload.genero,
        nombre_etiqueta: payload.nombreEtiqueta,
        valor_min: payload.valorMin,
        valor_max: payload.valorMax,
        edad_min: payload.edadMin,
        edad_max: payload.edadMax,
        color_sugerido: payload.colorSugerido ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear el rango: ${error?.message || 'Error desconocido'}`);
    }

    return data as RangoEvaluacion;
  }

  /**
   * Lista todos los rangos asociados a un tipo de evaluación, ordenados por edad y valor.
   */
  async listarRangosPorTipo(tipoEvaluacionId: number): Promise<RangoEvaluacion[]> {
    const { data, error } = await this.supabase
      .from('aca_evaluacion_rangos')
      .select('*')
      .eq('tipo_evaluacion_id', tipoEvaluacionId)
      .order('edad_min', { ascending: true })
      .order('valor_min', { ascending: true });

    if (error) {
      throw new Error(`No se pudo listar los rangos: ${error.message}`);
    }

    return (data ?? []) as RangoEvaluacion[];
  }

  /**
   * Busca un rango específico por su ID.
   */
  async obtenerRangoPorId(id: number): Promise<RangoEvaluacion> {
    const { data, error } = await this.supabase
      .from('aca_evaluacion_rangos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Rango no encontrado');
    }

    return data as RangoEvaluacion;
  }

  /**
   * Actualiza los valores, edades o colores de un rango (Solo Administrador según RLS).
   */
  async actualizarRango(id: number, payload: ActualizarRangoPayload): Promise<RangoEvaluacion> {
    const updateData: Record<string, any> = {};

    if (payload.tipoEvaluacionId !== undefined) updateData['tipo_evaluacion_id'] = payload.tipoEvaluacionId;
    if (payload.genero !== undefined) updateData['genero'] = payload.genero;
    if (payload.nombreEtiqueta !== undefined) updateData['nombre_etiqueta'] = payload.nombreEtiqueta;
    if (payload.valorMin !== undefined) updateData['valor_min'] = payload.valorMin;
    if (payload.valorMax !== undefined) updateData['valor_max'] = payload.valorMax;
    if (payload.edadMin !== undefined) updateData['edad_min'] = payload.edadMin;
    if (payload.edadMax !== undefined) updateData['edad_max'] = payload.edadMax;
    if (payload.colorSugerido !== undefined) updateData['color_sugerido'] = payload.colorSugerido;

    const { data, error } = await this.supabase
      .from('aca_evaluacion_rangos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar el rango: ${error?.message || 'Error desconocido'}`);
    }

    return data as RangoEvaluacion;
  }

  /**
   * Elimina un rango de la base de datos (Solo Administrador según RLS).
   */
  async eliminarRango(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('aca_evaluacion_rangos')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`No se pudo eliminar el rango: ${error.message}`);
    }
  }

  /**
   * Dado un tipo de evaluación, la edad del estudiante, género y el valor obtenido,
   * encuentra en qué rango/categoría cae (ej. "Alto", con su color).
   * Devuelve null si no hay ningún rango definido para esa combinación.
   */
  async encontrarRango(
    tipoEvaluacionId: number,
    edad: number,
    valor: number,
    genero: string
  ): Promise<RangoEvaluacion | null> {
    const { data, error } = await this.supabase
      .from('aca_evaluacion_rangos')
      .select('*')
      .eq('tipo_evaluacion_id', tipoEvaluacionId)
      .eq('genero', genero)
      .lte('edad_min', edad)
      .gte('edad_max', edad)
      .lte('valor_min', valor)
      .gte('valor_max', valor)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo determinar el rango: ${error.message}`);
    }

    return (data as RangoEvaluacion) ?? null;
  }
}