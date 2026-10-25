import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase';

export const BUCKET_FOTOS_USUARIOS = 'usuarios-fotos';
export const BUCKET_INFORMES_NUTRI = 'nutri-informes';

// Duración de las URLs firmadas: basta para la sesión de trabajo; al recargar se generan nuevas.
const SEGUNDOS_URL_FIRMADA = 60 * 60;

/**
 * Archivos de buckets privados (fotos de usuarios, informes de nutrición).
 *
 * En la base se guarda la URL pública "clásica" (…/object/public/<bucket>/<path>).
 * Con el bucket privado esa URL ya no abre, así que antes de mostrarla se cambia
 * por una URL firmada temporal. Storage solo firma si las políticas RLS dejan
 * al usuario ver el archivo.
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private supabase = inject(SupabaseService).client;

  /**
   * Obtiene el path dentro del bucket desde una URL pública, una firmada o un path suelto.
   * Devuelve null si la URL es de otro bucket o de otro sitio.
   */
  extraerPath(bucket: string, valor: string | null | undefined): string | null {
    if (!valor) return null;
    const sinQuery = valor.split('?')[0];
    const marcador = `/${bucket}/`;
    const indice = sinQuery.indexOf(marcador);

    if (indice !== -1) return decodeURIComponent(sinQuery.substring(indice + marcador.length));
    if (/^https?:\/\//i.test(sinQuery)) return null;
    return sinQuery;
  }

  /**
   * Firma en una sola petición todas las URLs del bucket y devuelve una función
   * que traduce cada valor original a su URL firmada (o lo deja igual si no aplica).
   */
  async firmarUrls(
    bucket: string,
    valores: (string | null | undefined)[]
  ): Promise<(valor: string | null | undefined) => string | null> {
    const paths = [...new Set(
      valores.map(v => this.extraerPath(bucket, v)).filter((p): p is string => !!p)
    )];

    const firmadas = new Map<string, string>();

    if (paths.length > 0) {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrls(paths, SEGUNDOS_URL_FIRMADA);

      if (error) {
        // Sin firmas se muestran los valores guardados: funciona mientras el bucket siga público
        console.warn(`No se pudieron firmar archivos de ${bucket}:`, error.message);
      } else {
        for (const item of data ?? []) {
          if (item.path && item.signedUrl) firmadas.set(item.path, item.signedUrl);
        }
      }
    }

    return (valor) => {
      if (!valor) return valor ?? null;
      const path = this.extraerPath(bucket, valor);
      return (path && firmadas.get(path)) || valor;
    };
  }

  /** Atajo para un solo archivo. */
  async firmarUrl(bucket: string, valor: string | null | undefined): Promise<string | null> {
    const resolver = await this.firmarUrls(bucket, [valor]);
    return resolver(valor);
  }

  /** Borra un archivo a partir de su URL (pública o firmada) o path. */
  async borrar(bucket: string, valor: string | null | undefined): Promise<void> {
    const path = this.extraerPath(bucket, valor);
    if (!path) return;
    const { error } = await this.supabase.storage.from(bucket).remove([path]);
    if (error) console.warn(`No se pudo borrar ${path} de ${bucket}:`, error.message);
  }
}
