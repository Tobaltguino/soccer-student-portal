import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  WebMetodologia,
  CrearWebMetodologiaPayload,
  ActualizarWebMetodologiaPayload
} from '../models/web-metodologia.interface';

@Injectable({
  providedIn: 'root'
})
export class WebMetodologiaService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea una nueva metodología web (Solo Administrador según RLS).
   */
  async crearMetodologia(payload: CrearWebMetodologiaPayload): Promise<WebMetodologia> {
    const { data, error } = await this.supabase
      .from('web_metodologias')
      .insert({
        icono: payload.icono,
        titulo: payload.titulo,
        descripcion: payload.descripcion ?? null,
        orden: payload.orden ?? 0,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear la metodología: ${error?.message || 'Error desconocido'}`);
    }

    return this.mapear(data);
  }

  /**
   * Lista todas las metodologías de la web ordenadas por la columna 'orden' (Público).
   */
  async listarMetodologias(): Promise<WebMetodologia[]> {
    const { data, error } = await this.supabase
      .from('web_metodologias')
      .select('*')
      .order('orden', { ascending: true });

    if (error) {
      throw new Error(`No se pudo listar las metodologías: ${error.message}`);
    }

    return (data ?? []).map((row: any) => this.mapear(row));
  }

  /**
   * Obtiene una metodología específica por su ID (Público).
   */
  async obtenerMetodologiaPorId(id: number): Promise<WebMetodologia> {
    const { data, error } = await this.supabase
      .from('web_metodologias')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Metodología no encontrada');
    }

    return this.mapear(data);
  }

  /**
   * Actualiza los datos de una metodología (Solo Administrador).
   */
  async actualizarMetodologia(id: number, payload: ActualizarWebMetodologiaPayload): Promise<WebMetodologia> {
    const updateData: Record<string, any> = {};

    if (payload.icono !== undefined) updateData['icono'] = payload.icono;
    if (payload.titulo !== undefined) updateData['titulo'] = payload.titulo;
    if (payload.descripcion !== undefined) updateData['descripcion'] = payload.descripcion;
    if (payload.orden !== undefined) updateData['orden'] = payload.orden;

    const { data, error } = await this.supabase
      .from('web_metodologias')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar la metodología: ${error?.message || 'Error desconocido'}`);
    }

    return this.mapear(data);
  }

  /**
   * Elimina la metodología de la base de datos (Solo Administrador).
   */
  async eliminarMetodologia(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('web_metodologias')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`No se pudo eliminar la metodología: ${error.message}`);
    }
  }

  // =========================================================================
  // MÉTODOS PRIVADOS PARA MAPEO
  // =========================================================================
  private mapear(row: any): WebMetodologia {
    return {
      id: row.id,
      icono: row.icono,
      titulo: row.titulo,
      descripcion: row.descripcion,
      orden: row.orden,
    };
  }
}