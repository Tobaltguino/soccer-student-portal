import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../../core/supabase/supabase';
import {
  KineSubevaluacion,
  CrearKineSubevaluacionPayload,
  ActualizarKineSubevaluacionPayload,
  CriterioPrioridad
} from '../models/subevaluacion.interface';

@Injectable({
  providedIn: 'root'
})
export class KineSubevaluacionService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea una nueva subevaluación asignada a un tipo de evaluación (Solo Administrador).
   */
  async crearSubevaluacion(payload: CrearKineSubevaluacionPayload): Promise<KineSubevaluacion> {
    const evaluaLados = payload.evaluaLados ?? false;
    const prioridad = this.normalizarPrioridad(evaluaLados, payload.prioridad);

    const { data, error } = await this.supabase
      .from('kine_subevaluaciones')
      .insert({
        tipo_evaluacion_id: payload.tipoEvaluacionId,
        nombre: payload.nombre,
        evalua_lados: evaluaLados,
        prioridad,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear la subevaluación: ${error?.message || 'El tipo de evaluación indicado no existe'}`);
    }

    return data as KineSubevaluacion;
  }

  /**
   * Lista todas las subevaluaciones asociadas a un tipo de evaluación específico.
   */
  async listarSubevaluacionesPorTipo(tipoEvaluacionId: number): Promise<KineSubevaluacion[]> {
    const { data, error } = await this.supabase
      .from('kine_subevaluaciones')
      .select('*')
      .eq('tipo_evaluacion_id', tipoEvaluacionId)
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`No se pudo listar las subevaluaciones: ${error.message}`);
    }

    return (data ?? []) as KineSubevaluacion[];
  }

  /**
   * Busca el detalle de una subevaluación específica por su ID.
   */
  async obtenerSubevaluacionPorId(id: number): Promise<KineSubevaluacion> {
    const { data, error } = await this.supabase
      .from('kine_subevaluaciones')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Subevaluación no encontrada');
    }

    return data as KineSubevaluacion;
  }

  /**
   * Actualiza los datos de una subevaluación y recalcula sus prioridades (Solo Administrador).
   */
  async actualizarSubevaluacion(id: number, payload: ActualizarKineSubevaluacionPayload): Promise<KineSubevaluacion> {
    const actual = await this.obtenerSubevaluacionPorId(id);

    const evaluaLadosFinal = payload.evaluaLados !== undefined ? payload.evaluaLados : actual.evalua_lados;
    const prioridadEntrante = payload.prioridad !== undefined ? payload.prioridad : actual.prioridad;
    const prioridadFinal = this.normalizarPrioridad(evaluaLadosFinal, prioridadEntrante);

    const updateData: Record<string, any> = { prioridad: prioridadFinal };
    if (payload.tipoEvaluacionId !== undefined) updateData['tipo_evaluacion_id'] = payload.tipoEvaluacionId;
    if (payload.nombre !== undefined) updateData['nombre'] = payload.nombre;
    if (payload.evaluaLados !== undefined) updateData['evalua_lados'] = payload.evaluaLados;

    const { data, error } = await this.supabase
      .from('kine_subevaluaciones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar la subevaluación: ${error?.message || 'Error desconocido'}`);
    }

    return data as KineSubevaluacion;
  }

  /**
   * Elimina permanentemente una subevaluación (Solo Administrador).
   */
  async eliminarSubevaluacion(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('kine_subevaluaciones')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        throw new Error('No se puede eliminar la subevaluación porque ya tiene resultados o datos asociados');
      }
      throw new Error(`No se pudo eliminar la subevaluación: ${error.message}`);
    }
  }

  /**
   * Garantiza consistencia entre evalua_lados y prioridad:
   * - Si NO evalúa lados, prioridad siempre queda en null.
   * - Si SÍ evalúa lados, prioridad es obligatoria ('MENOR' o 'MAYOR').
   */
  private normalizarPrioridad(
    evaluaLados: boolean,
    prioridad: CriterioPrioridad | null | undefined
  ): CriterioPrioridad | null {
    if (!evaluaLados) {
      return null;
    }

    if (prioridad !== 'MENOR' && prioridad !== 'MAYOR') {
      throw new Error('Debes indicar qué puntaje se prioriza (MENOR o MAYOR) cuando la subevaluación mide lados');
    }

    return prioridad;
  }
}