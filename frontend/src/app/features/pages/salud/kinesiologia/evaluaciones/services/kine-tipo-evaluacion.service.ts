import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../../core/supabase/supabase';
import {
  KineTipoEvaluacion,
  CrearKineTipoEvaluacionPayload,
  ActualizarKineTipoEvaluacionPayload
} from '../models/tipo-evaluacion.interface';

@Injectable({
  providedIn: 'root'
})
export class KineTipoEvaluacionService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea un nuevo tipo de evaluación kinesiológica (Solo Administrador según RLS).
   */
  async crearTipoEvaluacion(payload: CrearKineTipoEvaluacionPayload): Promise<KineTipoEvaluacion> {
    const { data, error } = await this.supabase
      .from('kine_tipos_evaluacion')
      .insert({
        nombre: payload.nombre,
        descripcion: payload.descripcion ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear el tipo de evaluación: ${error?.message || 'Error desconocido'}`);
    }

    return data as KineTipoEvaluacion;
  }

  /**
   * Lista todos los tipos de evaluación kinesiológica ordenados por nombre.
   */
  async listarTiposEvaluacion(): Promise<KineTipoEvaluacion[]> {
    const { data, error } = await this.supabase
      .from('kine_tipos_evaluacion')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`No se pudo listar los tipos de evaluación: ${error.message}`);
    }

    return (data ?? []) as KineTipoEvaluacion[];
  }

  /**
   * Obtiene el detalle de un tipo de evaluación por su ID.
   */
  async obtenerTipoEvaluacionPorId(id: number): Promise<KineTipoEvaluacion> {
    const { data, error } = await this.supabase
      .from('kine_tipos_evaluacion')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Tipo de evaluación no encontrado');
    }

    return data as KineTipoEvaluacion;
  }

  /**
   * Actualiza los datos de un tipo de evaluación (Solo Administrador).
   */
  async actualizarTipoEvaluacion(id: number, payload: ActualizarKineTipoEvaluacionPayload): Promise<KineTipoEvaluacion> {
    const updateData: Record<string, any> = {};

    if (payload.nombre !== undefined) updateData['nombre'] = payload.nombre;
    if (payload.descripcion !== undefined) updateData['descripcion'] = payload.descripcion;

    const { data, error } = await this.supabase
      .from('kine_tipos_evaluacion')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar el tipo de evaluación: ${error?.message || 'Error desconocido'}`);
    }

    return data as KineTipoEvaluacion;
  }

  /**
   * Elimina un tipo de evaluación (Solo Administrador).
   * Maneja el error de llave foránea (23503) si existen sesiones asociadas.
   */
  async eliminarTipoEvaluacion(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('kine_tipos_evaluacion')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        throw new Error('No se puede eliminar porque existen sesiones o evaluaciones asociadas a este tipo');
      }
      throw new Error(`No se pudo eliminar el tipo de evaluación: ${error.message}`);
    }
  }
}