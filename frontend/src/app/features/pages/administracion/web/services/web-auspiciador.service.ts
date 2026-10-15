import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  WebAuspiciador,
  CrearWebAuspiciadorPayload,
  ActualizarWebAuspiciadorPayload
} from '../models/web-auspiciador.interface';

const BUCKET = 'web-imagenes';
const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable({
  providedIn: 'root'
})
export class WebAuspiciadorService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea un nuevo auspiciador (Solo Administrador según RLS).
   */
  async crearAuspiciador(payload: CrearWebAuspiciadorPayload, imagen?: File | null): Promise<WebAuspiciador> {
    let imagenUrl: string | null = null;

    if (imagen) {
      this.validarImagen(imagen);
      imagenUrl = await this.subirImagen(imagen);
    }

    const { data, error } = await this.supabase
      .from('web_auspiciadores')
      .insert({
        nombre: payload.nombre,
        descripcion: payload.descripcion ?? null,
        orden: payload.orden ?? 0,
        imagen_url: imagenUrl,
        instagram_url: payload.instagramUrl ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      if (imagenUrl) await this.borrarImagen(imagenUrl);
      throw new Error(`No se pudo crear el auspiciador: ${error?.message || 'Error desconocido'}`);
    }

    return this.mapear(data);
  }

  /**
   * Lista todos los auspiciadores, ordenados por la columna 'orden' (Acceso Público).
   */
  async listarAuspiciadores(): Promise<WebAuspiciador[]> {
    const { data, error } = await this.supabase
      .from('web_auspiciadores')
      .select('*')
      .order('orden', { ascending: true });

    if (error) {
      throw new Error(`No se pudo listar los auspiciadores: ${error.message}`);
    }

    return (data ?? []).map((row: any) => this.mapear(row));
  }

  /**
   * Obtiene el detalle de un auspiciador específico (Acceso Público).
   */
  async obtenerAuspiciadorPorId(id: number): Promise<WebAuspiciador> {
    const { data, error } = await this.supabase
      .from('web_auspiciadores')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Auspiciador no encontrado');
    }

    return this.mapear(data);
  }

  /**
   * Actualiza los datos de un auspiciador y reemplaza su imagen si se envía una nueva (Solo Administrador).
   */
  async actualizarAuspiciador(
    id: number,
    payload: ActualizarWebAuspiciadorPayload,
    imagen?: File | null
  ): Promise<WebAuspiciador> {
    const auspiciadorExistente = await this.obtenerAuspiciadorPorId(id);
    let nuevaImagenUrl: string | undefined;

    if (imagen) {
      this.validarImagen(imagen);
      nuevaImagenUrl = await this.subirImagen(imagen);
    }

    const updateData: Record<string, any> = {};
    if (payload.nombre !== undefined) updateData['nombre'] = payload.nombre;
    if (payload.descripcion !== undefined) updateData['descripcion'] = payload.descripcion;
    if (payload.orden !== undefined) updateData['orden'] = payload.orden;
    if (payload.instagramUrl !== undefined) updateData['instagram_url'] = payload.instagramUrl;
    if (nuevaImagenUrl !== undefined) updateData['imagen_url'] = nuevaImagenUrl;

    const { data, error } = await this.supabase
      .from('web_auspiciadores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      if (nuevaImagenUrl) await this.borrarImagen(nuevaImagenUrl);
      throw new Error(`No se pudo actualizar el auspiciador: ${error?.message || 'Error desconocido'}`);
    }

    // Eliminar la imagen antigua si se subió una nueva
    if (nuevaImagenUrl && auspiciadorExistente.imagenUrl) {
      await this.borrarImagen(auspiciadorExistente.imagenUrl);
    }

    return this.mapear(data);
  }

  /**
   * Elimina el auspiciador de la BD y borra su imagen del bucket (Solo Administrador).
   */
  async eliminarAuspiciador(id: number): Promise<void> {
    const auspiciador = await this.obtenerAuspiciadorPorId(id);

    const { error } = await this.supabase
      .from('web_auspiciadores')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`No se pudo eliminar el auspiciador: ${error.message}`);
    }

    if (auspiciador.imagenUrl) {
      await this.borrarImagen(auspiciador.imagenUrl);
    }
  }

  /**
   * Elimina únicamente la imagen asociada al auspiciador sin borrar el registro (Solo Administrador).
   */
  async eliminarImagen(id: number): Promise<WebAuspiciador> {
    const auspiciador = await this.obtenerAuspiciadorPorId(id);

    if (auspiciador.imagenUrl) {
      await this.borrarImagen(auspiciador.imagenUrl);
    }

    const { data, error } = await this.supabase
      .from('web_auspiciadores')
      .update({ imagen_url: null })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo quitar la imagen: ${error?.message || 'Error desconocido'}`);
    }

    return this.mapear(data);
  }

  // =========================================================================
  // MÉTODOS PRIVADOS
  // =========================================================================
  private mapear(row: any): WebAuspiciador {
    return {
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      orden: row.orden,
      imagenUrl: row.imagen_url,
      instagramUrl: row.instagram_url,
    };
  }

  private validarImagen(imagen: File): void {
    if (!TIPOS_PERMITIDOS.includes(imagen.type)) {
      throw new Error(`Tipo no permitido: ${imagen.type}. Usa PNG, JPEG o WEBP.`);
    }
    if (imagen.size > TAMANO_MAXIMO_BYTES) {
      throw new Error('El archivo supera el tamaño máximo permitido (5 MB)');
    }
  }

  private async subirImagen(imagen: File): Promise<string> {
    const extension = imagen.name.split('.').pop() || 'jpg';
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const nombreArchivo = `auspiciadores/${uuid}.${extension}`;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(nombreArchivo, imagen, {
        contentType: imagen.type,
        upsert: false
      });

    if (error) {
      throw new Error(`No se pudo subir la imagen: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo);
    return data.publicUrl;
  }

  private async borrarImagen(url: string): Promise<void> {
    const marcador = `/${BUCKET}/`;
    const index = url.indexOf(marcador);
    if (index === -1) return;
    
    const path = url.substring(index + marcador.length);
    await this.supabase.storage.from(BUCKET).remove([path]);
  }
}