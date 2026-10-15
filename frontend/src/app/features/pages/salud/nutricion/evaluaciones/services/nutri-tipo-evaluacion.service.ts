import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../../core/supabase/supabase';
import {
  NutriTipoEvaluacion,
  CrearNutriTipoEvaluacionPayload,
  ActualizarNutriTipoEvaluacionPayload
} from '../models/tipo-evaluacion.interface';

@Injectable({
  providedIn: 'root'
})
export class NutriTipoEvaluacionService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea un nuevo tipo de evaluación nutricional (Solo Administrador según RLS).
   */
  async crearTipoEvaluacion(payload: CrearNutriTipoEvaluacionPayload): Promise<NutriTipoEvaluacion> {
    const { data, error } = await this.supabase
      .from('nutri_tipo_evaluacion')
      .insert({
        nombre: payload.nombre,
        descripcion: payload.descripcion ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear el tipo de evaluación: ${error?.message || 'Error desconocido'}`);
    }

    return data as NutriTipoEvaluacion;
  }

  /**
   * Lista todos los tipos de evaluación nutricional ordenados por nombre.
   */
  async listarTiposEvaluacion(): Promise<NutriTipoEvaluacion[]> {
    const { data, error } = await this.supabase
      .from('nutri_tipo_evaluacion')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`No se pudo listar los tipos de evaluación: ${error.message}`);
    }

    return (data ?? []) as NutriTipoEvaluacion[];
  }

  /**
   * Obtiene el detalle de un tipo de evaluación por su ID.
   */
  async obtenerTipoEvaluacionPorId(id: string): Promise<NutriTipoEvaluacion> {
    const { data, error } = await this.supabase
      .from('nutri_tipo_evaluacion')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Tipo de evaluación no encontrado');
    }

    return data as NutriTipoEvaluacion;
  }

  /**
   * Actualiza los datos de un tipo de evaluación (Solo Administrador).
   */
  async actualizarTipoEvaluacion(id: string, payload: ActualizarNutriTipoEvaluacionPayload): Promise<NutriTipoEvaluacion> {
    const updateData: Record<string, any> = {};

    if (payload.nombre !== undefined) updateData['nombre'] = payload.nombre;
    if (payload.descripcion !== undefined) updateData['descripcion'] = payload.descripcion;

    const { data, error } = await this.supabase
      .from('nutri_tipo_evaluacion')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar el tipo de evaluación: ${error?.message || 'Error desconocido'}`);
    }

    return data as NutriTipoEvaluacion;
  }

  /**
   * Elimina un tipo de evaluación (Solo Administrador).
   * Maneja el error de llave foránea (23503) si existen sesiones asociadas.
   */
  async eliminarTipoEvaluacion(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('nutri_tipo_evaluacion')
      .delete()
      .eq('id', id);

    if (error) {
      // 23503 es el código de PostgreSQL para foreign_key_violation
      if (error.code === '23503') {
        throw new Error('No se puede eliminar porque existen sesiones asociadas a este tipo de evaluación');
      }
      throw new Error(`No se pudo eliminar el tipo de evaluación: ${error.message}`);
    }
  }
}