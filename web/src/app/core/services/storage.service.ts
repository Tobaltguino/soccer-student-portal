import { Injectable } from '@angular/core';
import { SupabaseCoreService } from './supabase-core.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(private supabaseCore: SupabaseCoreService) {}

  private get supabase() {
    return this.supabaseCore.client;
  }

  // ==========================================
  // 1. SUBIDA DE IMÁGENES (Avatares, Logos, etc.)
  // ==========================================

  async subirFoto(archivo: File, carpeta: string = 'avatars'): Promise<string | null> {
    try {
      if (!archivo.type.startsWith('image/')) return null;

      const fileExt = archivo.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;

      const { error } = await this.supabase.storage.from(carpeta).upload(fileName, archivo, { cacheControl: '3600', upsert: false });
      if (error) return null;

      const { data } = this.supabase.storage.from(carpeta).getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      return null;
    }
  }

  // ==========================================
  // 2. ARCHIVOS Y DOCUMENTOS (Guías, Pautas)
  // ==========================================

  async uploadGuiaFile(file: File, tituloGuia: string) {
    const fileExt = file.name.split('.').pop();
    const tituloLimpio = this.limpiarNombreArchivo(tituloGuia);
    const fileName = `${tituloLimpio}_${new Date().getTime()}.${fileExt}`;

    const { error } = await this.supabase.storage.from('guias_trabajo').upload(fileName, file, { upsert: false });
    if (error) throw error;

    const { data } = this.supabase.storage.from('guias_trabajo').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async subirArchivoNutricion(file: File, fileName: string) {
    const fileExt = fileName.split('.').pop();
    const nombreSinExtension = fileName.substring(0, fileName.lastIndexOf('.'));
    const nombreLimpio = this.limpiarNombreArchivo(nombreSinExtension);
    const filePath = `evaluaciones/${Date.now()}_${nombreLimpio}.${fileExt}`;
    
    const { error } = await this.supabase.storage.from('documentos_nutricion').upload(filePath, file, { upsert: false });
    if (error) throw error;
    
    const { data } = this.supabase.storage.from('documentos_nutricion').getPublicUrl(filePath);
    return data.publicUrl;
  }

  // ==========================================
  // 3. BORRADO GENÉRICO DE ARCHIVOS
  // ==========================================

  /**
   * Elimina cualquier archivo de cualquier bucket usando su URL pública.
   * @param fileUrl URL completa del archivo en Supabase
   * @param bucket Nombre del bucket (ej: 'guias_trabajo', 'avatars')
   */
  async deleteArchivo(fileUrl: string, bucket: string = 'guias_trabajo') {
    try {
      if (!fileUrl) return { success: false };

      // Extraemos solo el nombre del archivo al final de la URL
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      const { error } = await this.supabase.storage.from(bucket).remove([fileName]);
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error(`Error eliminando archivo del bucket ${bucket}:`, error);
      return { success: false }; 
    }
  }

  // Alias para retrocompatibilidad con componentes que aún usen el nombre viejo
  async deleteGuiaFile(fileUrl: string) {
    return this.deleteArchivo(fileUrl, 'guias_trabajo');
  }

  // ==========================================
  // 🛠️ UTILERÍAS PRIVADAS
  // ==========================================

  private limpiarNombreArchivo(nombre: string): string {
    return nombre
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Elimina tildes
      .replace(/[^a-zA-Z0-9]/g, '_')                    // Reemplaza símbolos por '_'
      .replace(/_+/g, '_')                              // Evita múltiples '_' seguidos
      .toLowerCase();
  }

}