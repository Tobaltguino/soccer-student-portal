import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../../core/supabase/supabase';
import { StorageService, BUCKET_INFORMES_NUTRI } from '../../../../../../core/services/storage.service';
import {
  NutriResultado,
  NutriResultadoConDetalle,
  CrearNutriResultadoPayload,
  ActualizarNutriResultadoPayload
} from '../models/resultado.interface';

const BUCKET = BUCKET_INFORMES_NUTRI;
const TIPOS_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg'];
const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable({
  providedIn: 'root'
})
export class NutriResultadoService {
  private supabase = inject(SupabaseService).client;
  private storage = inject(StorageService);

  /**
   * Crea un nuevo resultado nutricional y sube su archivo adjunto si existe.
   */
  async crearResultado(payload: CrearNutriResultadoPayload, archivo?: File | null): Promise<NutriResultadoConDetalle> {
    let archivoUrl: string | null = null;

    if (archivo) {
      this.validarArchivo(archivo);
      archivoUrl = await this.subirArchivo(archivo);
    }

    const { data, error } = await this.supabase
      .from('nutri_evaluacion_resultados')
      .insert({
        evaluacion_id: payload.evaluacionId,
        estudiante_id: payload.estudianteId,
        observaciones: payload.observaciones ?? null,
        archivo_url: archivoUrl,
      })
      .select()
      .single();

    if (error || !data) {
      // Rollback del archivo si la inserción falla
      if (archivoUrl) await this.borrarArchivo(archivoUrl);
      throw new Error(`No se pudo crear el resultado: ${error?.message || 'Error desconocido'}`);
    }

    const enriquecidos = await this.enriquecerResultadosEnLote([data as NutriResultado]);
    return enriquecidos[0];
  }

  /**
   * Lista todos los resultados asociados a una sesión nutricional específica.
   */
  async listarResultadosPorSesion(evaluacionId: string): Promise<NutriResultadoConDetalle[]> {
    const { data, error } = await this.supabase
      .from('nutri_evaluacion_resultados')
      .select('*')
      .eq('evaluacion_id', evaluacionId);

    if (error) {
      throw new Error(`No se pudo listar los resultados: ${error.message}`);
    }

    return this.enriquecerResultadosEnLote((data ?? []) as NutriResultado[]);
  }

  /**
   * Lista los resultados nutricionales del estudiante autenticado (solo de sesiones FINALIZADAS).
   */
  async listarMisResultados(): Promise<NutriResultadoConDetalle[]> {
    const { data: authData } = await this.supabase.auth.getSession();
    const estudianteId = authData?.session?.user?.id;

    if (!estudianteId) throw new Error('Usuario no autenticado');

    const { data, error } = await this.supabase
      .from('nutri_evaluacion_resultados')
      .select('*, nutri_evaluacion_sesiones!inner(estado)')
      .eq('estudiante_id', estudianteId)
      .eq('nutri_evaluacion_sesiones.estado', 'FINALIZADA')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`No se pudieron listar tus resultados: ${error.message}`);
    }

    const resultadosLimpios = (data ?? []).map(
      ({ nutri_evaluacion_sesiones, ...resto }: any) => resto
    ) as NutriResultado[];

    return this.enriquecerResultadosEnLote(resultadosLimpios);
  }

  /**
   * Actualiza las observaciones de un resultado o reemplaza el archivo adjunto.
   */
  async actualizarResultado(
    id: string,
    payload: ActualizarNutriResultadoPayload,
    archivo?: File | null
  ): Promise<NutriResultadoConDetalle> {
    const resultadoActual = await this.obtenerPorIdBase(id);
    let nuevaArchivoUrl: string | undefined;

    if (archivo) {
      this.validarArchivo(archivo);
      nuevaArchivoUrl = await this.subirArchivo(archivo);
    }

    const updateData: Record<string, any> = {};
    if (payload.observaciones !== undefined) updateData['observaciones'] = payload.observaciones;
    if (nuevaArchivoUrl !== undefined) updateData['archivo_url'] = nuevaArchivoUrl;

    const { data, error } = await this.supabase
      .from('nutri_evaluacion_resultados')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      if (nuevaArchivoUrl) await this.borrarArchivo(nuevaArchivoUrl);
      throw new Error(`No se pudo actualizar el resultado: ${error?.message || 'Error desconocido'}`);
    }

    // Limpiamos el archivo antiguo si se subió uno nuevo exitosamente
    if (nuevaArchivoUrl && resultadoActual.archivo_url) {
      await this.borrarArchivo(resultadoActual.archivo_url);
    }

    const enriquecidos = await this.enriquecerResultadosEnLote([data as NutriResultado]);
    return enriquecidos[0];
  }

  /**
   * Elimina permanentemente un resultado y su archivo asociado del bucket.
   */
  async eliminarResultado(id: string): Promise<void> {
    const resultado = await this.obtenerPorIdBase(id);

    const { error } = await this.supabase
      .from('nutri_evaluacion_resultados')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`No se pudo eliminar el resultado: ${error.message}`);
    }

    if (resultado.archivo_url) {
      await this.borrarArchivo(resultado.archivo_url);
    }
  }

  // =========================================================================
  // MÉTODOS PRIVADOS AUXILIARES Y DE STORAGE
  // =========================================================================
  private async obtenerPorIdBase(id: string): Promise<NutriResultado> {
    const { data, error } = await this.supabase
      .from('nutri_evaluacion_resultados')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new Error('Resultado no encontrado');
    return data as NutriResultado;
  }

  private async enriquecerResultadosEnLote(resultados: NutriResultado[]): Promise<NutriResultadoConDetalle[]> {
    if (resultados.length === 0) return [];

    const evaluacionIds = [...new Set(resultados.map(r => r.evaluacion_id))];

    // Traemos las sesiones y sus respectivos tipos en una sola consulta
    const { data: sesionesData } = await this.supabase
      .from('nutri_evaluacion_sesiones')
      .select(`
        id,
        fecha,
        tipo:nutri_tipo_evaluacion ( nombre )
      `)
      .in('id', evaluacionIds);

    const mapaSesiones = new Map<string, any>(
      (sesionesData ?? []).map((s: any) => [s.id, s])
    );

    // Informes en bucket privado: URLs firmadas en una sola petición
    const firmarArchivo = await this.storage.firmarUrls(BUCKET, resultados.map(r => r.archivo_url));

    return resultados.map(resultado => {
      const sesion = mapaSesiones.get(resultado.evaluacion_id);
      const tipoObj = Array.isArray(sesion?.tipo) ? sesion?.tipo[0] : sesion?.tipo;

      return {
        ...resultado,
        archivo_url: firmarArchivo(resultado.archivo_url),
        evaluacion: {
          nombre: tipoObj?.nombre ?? 'Desconocido',
          fecha: sesion?.fecha ?? '',
        }
      };
    });
  }

  private validarArchivo(archivo: File): void {
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      throw new Error(`Tipo de archivo no permitido: ${archivo.type}. Usa PDF, PNG o JPEG.`);
    }
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      throw new Error('El archivo supera el tamaño máximo permitido (10 MB)');
    }
  }

  private async subirArchivo(archivo: File): Promise<string> {
    const extension = archivo.name.split('.').pop() || 'pdf';
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const nombreArchivo = `${uuid}.${extension}`;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(nombreArchivo, archivo, { contentType: archivo.type, upsert: false });

    if (error) {
      throw new Error(`No se pudo subir el archivo: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo);
    return data.publicUrl;
  }

  private async borrarArchivo(url: string): Promise<void> {
    await this.storage.borrar(BUCKET, url);
  }
}