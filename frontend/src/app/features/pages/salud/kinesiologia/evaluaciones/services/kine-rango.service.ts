import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../../core/supabase/supabase';
import {
  KineRango,
  CrearKineRangoPayload,
  ActualizarKineRangoPayload
} from '../models/rango.interface';

@Injectable({
  providedIn: 'root'
})
export class KineRangoService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea un nuevo rango o puntaje para una subevaluación (Solo Administrador).
   */
  async crearRango(payload: CrearKineRangoPayload): Promise<KineRango> {
    const { data, error } = await this.supabase
      .from('kine_evaluacion_rangos')
      .insert({
        subevaluacion_id: payload.subevaluacionId,
        puntaje: payload.puntaje,
        etiqueta: payload.etiqueta,
        color: payload.color ?? null,
        descripcion: payload.descripcion ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear el rango: ${error?.message || 'La subevaluación indicada no existe'}`);
    }

    return data as KineRango;
  }

  /**
   * Lista todos los rangos (puntajes y colores) de una subevaluación específica.
   */
  async listarRangosPorSubevaluacion(subevaluacionId: number): Promise<KineRango[]> {
    const { data, error } = await this.supabase
      .from('kine_evaluacion_rangos')
      .select('*')
      .eq('subevaluacion_id', subevaluacionId)
      .order('puntaje', { ascending: true });

    if (error) {
      throw new Error(`No se pudo listar los rangos: ${error.message}`);
    }

    return (data ?? []) as KineRango[];
  }

  /**
   * Busca el detalle de un rango específico.
   */
  async obtenerRangoPorId(id: number): Promise<KineRango> {
    const { data, error } = await this.supabase
      .from('kine_evaluacion_rangos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Rango no encontrado');
    }

    return data as KineRango;
  }

  /**
   * Actualiza el puntaje, etiqueta, color o descripción de un rango (Solo Administrador).
   */
  async actualizarRango(id: number, payload: ActualizarKineRangoPayload): Promise<KineRango> {
    const updateData: Record<string, any> = {};

    if (payload.subevaluacionId !== undefined) updateData['subevaluacion_id'] = payload.subevaluacionId;
    if (payload.puntaje !== undefined) updateData['puntaje'] = payload.puntaje;
    if (payload.etiqueta !== undefined) updateData['etiqueta'] = payload.etiqueta;
    if (payload.color !== undefined) updateData['color'] = payload.color;
    if (payload.descripcion !== undefined) updateData['descripcion'] = payload.descripcion;

    const { data, error } = await this.supabase
      .from('kine_evaluacion_rangos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar el rango: ${error?.message || 'Error desconocido'}`);
    }

    return data as KineRango;
  }

  /**
   * Elimina permanentemente un rango (Solo Administrador).
   */
  async eliminarRango(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('kine_evaluacion_rangos')
      .delete()
      .eq('id', id);

    if (error) {
      // 23503: Foreign key violation por si un rango ya está guardado en los resultados de un paciente
      if (error.code === '23503') {
        throw new Error('No se puede eliminar el rango porque ya ha sido utilizado en evaluaciones de pacientes');
      }
      throw new Error(`No se pudo eliminar el rango: ${error.message}`);
    }
  }
}