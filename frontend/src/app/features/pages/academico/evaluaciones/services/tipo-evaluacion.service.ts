import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  TipoEvaluacion,
  CrearTipoEvaluacionPayload,
  ActualizarTipoEvaluacionPayload
} from '../models/tipo-evaluacion.interface';

@Injectable({
  providedIn: 'root'
})
export class TipoEvaluacionService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea una nueva plantilla o tipo de evaluación (Solo Administrador según RLS).
   */
  async crearTipoEvaluacion(payload: CrearTipoEvaluacionPayload): Promise<TipoEvaluacion> {
    const { data, error } = await this.supabase
      .from('aca_tipo_evaluacion')
      .insert({
        nombre: payload.nombre,
        unidad_medida: payload.unidadMedida,
        descripcion: payload.descripcion ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear el tipo de evaluación: ${error?.message || 'Error desconocido'}`);
    }

    return data as TipoEvaluacion;
  }

  /**
   * Lista todos los tipos de evaluación disponibles ordenados por nombre.
   */
  async listarTiposEvaluacion(): Promise<TipoEvaluacion[]> {
    const { data, error } = await this.supabase
      .from('aca_tipo_evaluacion')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`No se pudo listar los tipos de evaluación: ${error.message}`);
    }

    return (data ?? []) as TipoEvaluacion[];
  }

  /**
   * Busca un tipo de evaluación específico por su ID.
   */
  async obtenerTipoEvaluacionPorId(id: number): Promise<TipoEvaluacion> {
    const { data, error } = await this.supabase
      .from('aca_tipo_evaluacion')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Tipo de evaluación no encontrado');
    }

    return data as TipoEvaluacion;
  }

  /**
   * Actualiza los datos de un tipo de evaluación (Solo Administrador según RLS).
   */
  async actualizarTipoEvaluacion(
    id: number,
    payload: ActualizarTipoEvaluacionPayload
  ): Promise<TipoEvaluacion> {
    const updateData: Record<string, any> = {};

    if (payload.nombre !== undefined) updateData['nombre'] = payload.nombre;
    if (payload.unidadMedida !== undefined) updateData['unidad_medida'] = payload.unidadMedida;
    if (payload.descripcion !== undefined) updateData['descripcion'] = payload.descripcion;

    const { data, error } = await this.supabase
      .from('aca_tipo_evaluacion')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar el tipo de evaluación: ${error?.message || 'Error desconocido'}`);
    }

    return data as TipoEvaluacion;
  }

  /**
   * Elimina un tipo de evaluación de la base de datos (Solo Administrador según RLS).
   */
  async eliminarTipoEvaluacion(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('aca_tipo_evaluacion')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`No se pudo eliminar el tipo de evaluación: ${error.message}`);
    }
  }
}