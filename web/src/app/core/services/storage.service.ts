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
  // 1. FOTOS DE PERFIL (Avatares)
  // ==========================================

  async subirFoto(archivo: File, carpeta: string = 'avatars'): Promise<string | null> {
    try {
      if (!archivo.type.startsWith('image/')) return null;

      const fileExt = archivo.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;

      const { error: uploadError } = await this.supabase.storage
        .from(carpeta)
        .upload(fileName, archivo, { cacheControl: '3600', upsert: false });

      if (uploadError) return null;

      const { data } = this.supabase.storage.from(carpeta).getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      return null;
    }
  }

  // ==========================================
  // 2. GUÍAS DE TRABAJO (Material de Estudio)
  // ==========================================

  async uploadGuiaFile(file: File, tituloGuia: string) {
    const fileExt = file.name.split('.').pop();
    const tituloLimpio = this.limpiarNombreArchivo(tituloGuia);
    const fileName = `${tituloLimpio}_${new Date().getTime()}.${fileExt}`;

    const { error } = await this.supabase.storage
      .from('guias_trabajo')
      .upload(fileName, file, { upsert: false });

    if (error) throw error;

    const { data: urlData } = this.supabase.storage.from('guias_trabajo').getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  async deleteGuiaFile(fileUrl: string) {
    try {
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      const { error } = await this.supabase.storage.from('guias_trabajo').remove([fileName]);
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      return { success: false }; // Evita romper la app si falla el borrado
    }
  }

  // ==========================================
  // 3. ARCHIVOS DE NUTRICIÓN (Pautas/Exámenes)
  // ==========================================

  async subirArchivoNutricion(file: File, fileName: string) {
    const fileExt = fileName.split('.').pop();
    const nombreSinExtension = fileName.substring(0, fileName.lastIndexOf('.'));
    const nombreLimpio = this.limpiarNombreArchivo(nombreSinExtension);
    
    // Armamos la ruta dentro de la subcarpeta 'evaluaciones/'
    const filePath = `evaluaciones/${Date.now()}_${nombreLimpio}.${fileExt}`;
    
    const { error } = await this.supabase.storage
      .from('documentos_nutricion')
      .upload(filePath, file, { upsert: false });

    if (error) throw error;
    
    const { data: publicUrlData } = this.supabase.storage.from('documentos_nutricion').getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  }

  // ==========================================
  // 🛠️ UTILERÍAS PRIVADAS
  // ==========================================

  /**
   * Quita tildes, caracteres especiales y reemplaza espacios por guiones bajos.
   */
  private limpiarNombreArchivo(nombre: string): string {
    return nombre
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Elimina tildes
      .replace(/[^a-zA-Z0-9]/g, '_')                    // Reemplaza símbolos y espacios por '_'
      .replace(/_+/g, '_')                              // Evita múltiples guiones bajos seguidos
      .toLowerCase();
  }

}