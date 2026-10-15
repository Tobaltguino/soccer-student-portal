import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  WebBeneficio,
  CrearWebBeneficioPayload,
  ActualizarWebBeneficioPayload
} from '../models/web-beneficio.interface';

const BUCKET = 'web-imagenes';
const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable({
  providedIn: 'root'
})
export class WebBeneficioService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea un nuevo beneficio web y sube su imagen si se adjunta (Solo Administrador).
   */
  async crearBeneficio(payload: CrearWebBeneficioPayload, imagen?: File | null): Promise<WebBeneficio> {
    let imagenUrl: string | null = null;

    if (imagen) {
      this.validarImagen(imagen);
      imagenUrl = await this.subirImagen(imagen);
    }

    const { data, error } = await this.supabase
      .from('web_beneficios')
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
      // Rollback: si falló la inserción en BD, borramos la imagen que acabamos de subir
      if (imagenUrl) await this.borrarImagen(imagenUrl);
      throw new Error(`No se pudo crear el beneficio: ${error?.message || 'Error desconocido'}`);
    }

    return this.mapear(data);
  }

  /**
   * Lista todos los beneficios de la web ordenados por la columna 'orden' (Público).
   */
  async listarBeneficios(): Promise<WebBeneficio[]> {
    const { data, error } = await this.supabase
      .from('web_beneficios')
      .select('*')
      .order('orden', { ascending: true });

    if (error) {
      throw new Error(`No se pudo listar los beneficios: ${error.message}`);
    }

    return (data ?? []).map((row: any) => this.mapear(row));
  }

  /**
   * Obtiene un beneficio específico por su ID (Público).
   */
  async obtenerBeneficioPorId(id: number): Promise<WebBeneficio> {
    const { data, error } = await this.supabase
      .from('web_beneficios')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Beneficio no encontrado');
    }

    return this.mapear(data);
  }

  /**
   * Actualiza los datos de un beneficio y reemplaza su imagen si se envía una nueva (Solo Administrador).
   */
  async actualizarBeneficio(
    id: number,
    payload: ActualizarWebBeneficioPayload,
    imagen?: File | null
  ): Promise<WebBeneficio> {
    const beneficioExistente = await this.obtenerBeneficioPorId(id);
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
      .from('web_beneficios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      // Rollback imagen nueva si la actualización falló
      if (nuevaImagenUrl) await this.borrarImagen(nuevaImagenUrl);
      throw new Error(`No se pudo actualizar el beneficio: ${error?.message || 'Error desconocido'}`);
    }

    // Borrar imagen antigua si se reemplazó exitosamente
    if (nuevaImagenUrl && beneficioExistente.imagenUrl) {
      await this.borrarImagen(beneficioExistente.imagenUrl);
    }

    return this.mapear(data);
  }

  /**
   * Elimina el beneficio de la tabla y borra su imagen asociada del bucket (Solo Administrador).
   */
  async eliminarBeneficio(id: number): Promise<void> {
    const beneficio = await this.obtenerBeneficioPorId(id);

    const { error } = await this.supabase
      .from('web_beneficios')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`No se pudo eliminar el beneficio: ${error.message}`);
    }

    if (beneficio.imagenUrl) {
      await this.borrarImagen(beneficio.imagenUrl);
    }
  }

  /**
   * Elimina únicamente la imagen asociada al beneficio sin borrar el registro de la tabla (Solo Administrador).
   */
  async eliminarImagen(id: number): Promise<WebBeneficio> {
    const beneficio = await this.obtenerBeneficioPorId(id);

    if (beneficio.imagenUrl) {
      await this.borrarImagen(beneficio.imagenUrl);
    }

    const { data, error } = await this.supabase
      .from('web_beneficios')
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
  // MÉTODOS PRIVADOS PARA MAPEO Y GESTIÓN DE ARCHIVOS
  // =========================================================================
  private mapear(row: any): WebBeneficio {
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
    
    // 🔥 Guardamos en la subcarpeta 'beneficios'
    const nombreArchivo = `beneficios/${uuid}.${extension}`;

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