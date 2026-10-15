import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  WebPrograma,
  CrearWebProgramaPayload,
  ActualizarWebProgramaPayload
} from '../models/web-programa.interface';

@Injectable({
  providedIn: 'root'
})
export class WebProgramaService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea un nuevo programa web (Solo Administrador según RLS).
   */
  async crearPrograma(payload: CrearWebProgramaPayload): Promise<WebPrograma> {
    const { data, error } = await this.supabase
      .from('web_programas')
      .insert({
        icono: payload.icono,
        color_fondo: payload.colorFondo ?? null,
        color_texto: payload.colorTexto ?? null,
        titulo: payload.titulo,
        descripcion: payload.descripcion ?? null,
        orden: payload.orden ?? 0,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear el programa: ${error?.message || 'Error desconocido'}`);
    }

    return this.mapear(data);
  }

  /**
   * Lista todos los programas web ordenados por la columna 'orden' (Público).
   */
  async listarProgramas(): Promise<WebPrograma[]> {
    const { data, error } = await this.supabase
      .from('web_programas')
      .select('*')
      .order('orden', { ascending: true });

    if (error) {
      throw new Error(`No se pudo listar los programas: ${error.message}`);
    }

    return (data ?? []).map((row: any) => this.mapear(row));
  }

  /**
   * Obtiene un programa específico por su ID (Público).
   */
  async obtenerProgramaPorId(id: number): Promise<WebPrograma> {
    const { data, error } = await this.supabase
      .from('web_programas')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Programa no encontrado');
    }

    return this.mapear(data);
  }

  /**
   * Actualiza los datos de un programa web (Solo Administrador).
   */
  async actualizarPrograma(id: number, payload: ActualizarWebProgramaPayload): Promise<WebPrograma> {
    const updateData: Record<string, any> = {};

    if (payload.icono !== undefined) updateData['icono'] = payload.icono;
    if (payload.colorFondo !== undefined) updateData['color_fondo'] = payload.colorFondo;
    if (payload.colorTexto !== undefined) updateData['color_texto'] = payload.colorTexto;
    if (payload.titulo !== undefined) updateData['titulo'] = payload.titulo;
    if (payload.descripcion !== undefined) updateData['descripcion'] = payload.descripcion;
    if (payload.orden !== undefined) updateData['orden'] = payload.orden;

    const { data, error } = await this.supabase
      .from('web_programas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar el programa: ${error?.message || 'Error desconocido'}`);
    }

    return this.mapear(data);
  }

  /**
   * Elimina el programa de la base de datos (Solo Administrador).
   */
  async eliminarPrograma(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('web_programas')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`No se pudo eliminar el programa: ${error.message}`);
    }
  }

  // =========================================================================
  // MÉTODOS PRIVADOS PARA MAPEO
  // =========================================================================
  private mapear(row: any): WebPrograma {
    return {
      id: row.id,
      icono: row.icono,
      colorFondo: row.color_fondo,
      colorTexto: row.color_texto,
      titulo: row.titulo,
      descripcion: row.descripcion,
      orden: row.orden,
    };
  }
}