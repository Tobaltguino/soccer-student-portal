import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  Material,
  CrearMaterialPayload,
  ActualizarMaterialPayload,
  FiltrosMaterial,
  PaginacionMaterial
} from '../models/material.interface';

const BUCKET = 'material-complementario';
const TIPOS_PERMITIDOS = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'video/mp4',
];
const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB

@Injectable({
  providedIn: 'root'
})
export class MaterialService {
  private supabase = inject(SupabaseService).client;

  /**
   * Valida el archivo, lo sube al bucket 'material-complementario' y crea el registro en 'aca_material_complementario'.
   * RLS valida automáticamente que el rol coincida con su 'tipo_material' permitido y que 'creado_por = auth.uid()'.
   */
  async crearMaterial(payload: CrearMaterialPayload, archivo: File): Promise<Material> {
    this.validarArchivo(archivo);

    const { data: authData } = await this.supabase.auth.getUser();
    const userId = authData?.user?.id;

    if (!userId) {
      throw new Error('Debes iniciar sesión para subir material complementario');
    }

    const archivoUrl = await this.subirArchivo(archivo);

    const { data, error } = await this.supabase
      .from('aca_material_complementario')
      .insert({
        titulo: payload.titulo,
        descripcion: payload.descripcion ?? null,
        archivo_url: archivoUrl,
        tipo_material: payload.tipoMaterial,
        grupo_id: payload.grupoId ?? null,
        clase_id: payload.claseId ?? null,
        creado_por: userId,
      })
      .select()
      .single();

    if (error || !data) {
      // Limpiamos el archivo huérfano del bucket si falló la inserción en la tabla
      await this.eliminarArchivoDelBucket(archivoUrl);
      throw new Error(`No se pudo crear el material: ${error?.message || 'Permisos insuficientes o datos inválidos'}`);
    }

    return data as Material;
  }

  /**
   * Lista el material filtrado y paginado.
   * RLS filtra automáticamente (ej. Nutricionistas ven solo 'NUTRICION', los demás ven todos).
   */
  async listarMaterial(filtros: FiltrosMaterial = {}): Promise<PaginacionMaterial> {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let query = this.supabase
      .from('aca_material_complementario')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(desde, hasta);

    if (filtros.grupoId !== undefined && filtros.grupoId !== null) {
      query = query.eq('grupo_id', filtros.grupoId);
    }

    if (filtros.claseId !== undefined && filtros.claseId !== null) {
      query = query.eq('clase_id', filtros.claseId);
    }

    if (filtros.tipoMaterial) {
      query = query.eq('tipo_material', filtros.tipoMaterial);
    }

    if (filtros.busqueda) {
      const b = filtros.busqueda.replace(/[%_]/g, '');
      query = query.or(`titulo.ilike.%${b}%,descripcion.ilike.%${b}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`No se pudo listar el material: ${error.message}`);
    }

    return {
      registros: (data ?? []) as Material[],
      total: count ?? 0,
      pagina,
      limite,
    };
  }

  /**
   * Obtiene un material específico por su ID.
   */
  async buscarMaterialPorId(id: string): Promise<Material> {
    const { data, error } = await this.supabase
      .from('aca_material_complementario')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Material no encontrado');
    }

    return data as Material;
  }

  /**
   * Actualiza los metadatos del material y, opcionalmente, reemplaza el archivo físico en Storage.
   * RLS garantiza que solo el creador (en su área) o un Administrador puedan actualizarlo.
   */
  async actualizarMaterial(
    id: string,
    payload: ActualizarMaterialPayload,
    archivo?: File | null
  ): Promise<Material> {
    const materialExistente = await this.buscarMaterialPorId(id);
    let nuevaArchivoUrl: string | undefined;

    if (archivo) {
      this.validarArchivo(archivo);
      nuevaArchivoUrl = await this.subirArchivo(archivo);
    }

    const updateData: Record<string, any> = {};
    if (payload.titulo !== undefined) updateData['titulo'] = payload.titulo;
    if (payload.descripcion !== undefined) updateData['descripcion'] = payload.descripcion;
    if (payload.tipoMaterial !== undefined) updateData['tipo_material'] = payload.tipoMaterial;
    if (payload.grupoId !== undefined) updateData['grupo_id'] = payload.grupoId;
    if (payload.claseId !== undefined) updateData['clase_id'] = payload.claseId;
    if (nuevaArchivoUrl !== undefined) updateData['archivo_url'] = nuevaArchivoUrl;

    const { data, error } = await this.supabase
      .from('aca_material_complementario')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      // Si habíamos subido un archivo nuevo pero la actualización en BD falló, borramos el archivo nuevo
      if (nuevaArchivoUrl) {
        await this.eliminarArchivoDelBucket(nuevaArchivoUrl);
      }
      throw new Error(`No se pudo actualizar el material: ${error?.message || 'No tienes permisos para editar este material'}`);
    }

    // Si todo salió bien en BD y se reemplazó el archivo, eliminamos el archivo antiguo del bucket
    if (nuevaArchivoUrl && materialExistente.archivo_url) {
      await this.eliminarArchivoDelBucket(materialExistente.archivo_url);
    }

    return data as Material;
  }

  /**
   * Elimina el registro de la base de datos y su archivo asociado del bucket (Solo Administrador según RLS).
   */
  async eliminarMaterial(id: string): Promise<void> {
    const material = await this.buscarMaterialPorId(id);

    const { error } = await this.supabase
      .from('aca_material_complementario')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`No se pudo eliminar el material: ${error.message}`);
    }

    if (material.archivo_url) {
      await this.eliminarArchivoDelBucket(material.archivo_url);
    }
  }

  // =========================================================================
  // MÉTODOS PRIVADOS PARA SUPABASE STORAGE Y VALIDACIÓN DE ARCHIVOS
  // =========================================================================
  private validarArchivo(archivo: File): void {
    if (!archivo) {
      throw new Error('Debes adjuntar un archivo');
    }

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      throw new Error(`Tipo de archivo no permitido: ${archivo.type}. Solo se aceptan PDF, PNG, JPG y MP4.`);
    }

    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      throw new Error('El archivo supera el tamaño máximo permitido (20 MB)');
    }
  }

  private async subirArchivo(archivo: File): Promise<string> {
    const extension = archivo.name.split('.').pop() || 'bin';
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const nombreArchivo = `${uuid}.${extension}`;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(nombreArchivo, archivo, {
        contentType: archivo.type,
        upsert: false
      });

    if (error) {
      throw new Error(`No se pudo subir el archivo al Storage: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo);
    return data.publicUrl;
  }

  private extraerPathDesdeUrl(url: string): string | null {
    const marcador = `/${BUCKET}/`;
    const index = url.indexOf(marcador);
    if (index === -1) return null;
    return url.substring(index + marcador.length);
  }

  private async eliminarArchivoDelBucket(url: string): Promise<void> {
    const path = this.extraerPathDesdeUrl(url);
    if (path) {
      await this.supabase.storage.from(BUCKET).remove([path]);
    }
  }
}